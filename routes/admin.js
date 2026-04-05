const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Lot = require('../models/Lot');
const Bid = require('../models/Bid');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Page = require('../models/Page');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Setting = require('../models/Setting');
const NotificationService = require('../services/notificationService');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin', 'superadmin'));

// ---------- DASHBOARD ----------
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalUsers, totalAuctions, liveAuctions, pendingOrders, pendingKYC, pendingClients, totalRevenue] = await Promise.all([
      User.countDocuments(),
      Auction.countDocuments(),
      Auction.countDocuments({ status: 'live' }),
      Order.countDocuments({ paymentStatus: 'pending' }),
      User.countDocuments({ "kyc.status": 'pending' }),
      User.countDocuments({ role: 'client', clientApproved: false }),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    ]);

    const recentOrders = await Order.find().sort('-createdAt').limit(5)
      .populate('buyer', 'firstName lastName').populate('lot', 'title');

    const recentActivity = await ActivityLog.find().sort('-createdAt').limit(10)
      .populate('user', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers, totalAuctions, liveAuctions, pendingOrders,
          pendingKYC, pendingClients,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        recentOrders,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ---------- USER MANAGEMENT ----------
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status === 'active') { filter.isActive = true; filter.isSuspended = false; }
    if (req.query.status === 'suspended') filter.isSuspended = true;
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort('-createdAt').skip(skip).limit(limit);

    res.json({ success: true, data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const { role, isActive, commissionRate, firstName, lastName, email, phone, companyName, clientApproved } = req.body;
    
    // Build update object dynamically to only update provided fields
    const updateFields = {};
    if (role !== undefined) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (commissionRate !== undefined) updateFields.commissionRate = commissionRate;
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (companyName !== undefined) updateFields.companyName = companyName;
    if (clientApproved !== undefined) updateFields.clientApproved = clientApproved;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    await ActivityLog.create({ user: req.user._id, action: 'update_user', resource: 'User', resourceId: user._id, details: req.body, ipAddress: req.ip });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    await ActivityLog.create({ user: req.user._id, action: 'delete_user', resource: 'User', resourceId: req.params.id, ipAddress: req.ip });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true, suspensionReason: req.body.reason }, { new: true });
    await ActivityLog.create({ user: req.user._id, action: 'suspend_user', resource: 'User', resourceId: user._id, details: { reason: req.body.reason }, ipAddress: req.ip });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id/activate', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: false, suspensionReason: '', isActive: true }, { new: true });
    await ActivityLog.create({ user: req.user._id, action: 'activate_user', resource: 'User', resourceId: user._id, ipAddress: req.ip });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ---------- CLIENT APPROVAL ----------
router.get('/clients/pending', async (req, res, next) => {
  try {
    const clients = await User.find({ role: 'client', clientApproved: false }).sort('-createdAt');
    res.json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
});

router.put('/clients/:id/approve', async (req, res, next) => {
  try {
    const client = await User.findByIdAndUpdate(req.params.id, { clientApproved: true }, { new: true });
    const io = req.app.get('io');
    if (io) {
      await NotificationService.create({ recipient: client._id, type: 'client_approved', title: 'Account Approved', message: 'Your auction house account has been approved. You can now create auctions.', priority: 'high' });
    }
    await ActivityLog.create({ user: req.user._id, action: 'approve_client', resource: 'User', resourceId: client._id, ipAddress: req.ip });
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
});

router.put('/clients/:id/reject', async (req, res, next) => {
  try {
    const client = await User.findByIdAndUpdate(req.params.id, { clientApproved: false, suspensionReason: req.body.reason }, { new: true });
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
});

// ---------- AUCTION OVERSIGHT ----------
router.get('/auctions', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.title = new RegExp(req.query.search, 'i');

    const total = await Auction.countDocuments(filter);
    const auctions = await Auction.find(filter).populate('client', 'companyName firstName lastName').sort('-createdAt').skip(skip).limit(limit);

    res.json({ success: true, data: auctions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.put('/auctions/:id', [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time is required'),
], validate, async (req, res, next) => {
  try {
    const auction = await Auction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!auction) return res.status(404).json({ success: false, error: 'Auction not found' });
    await ActivityLog.create({ user: req.user._id, action: 'update_auction', resource: 'Auction', resourceId: auction._id, details: req.body, ipAddress: req.ip });
    res.json({ success: true, data: auction });
  } catch (error) {
    next(error);
  }
});

router.put('/auctions/:id/cancel', async (req, res, next) => {
  try {
    const auction = await Auction.findByIdAndUpdate(req.params.id, { status: 'cancelled', adminNotes: req.body.reason }, { new: true });
    await ActivityLog.create({ user: req.user._id, action: 'cancel_auction', resource: 'Auction', resourceId: auction._id, details: { reason: req.body.reason }, ipAddress: req.ip });
    res.json({ success: true, data: auction });
  } catch (error) {
    next(error);
  }
});

router.put('/auctions/:id/suspend', async (req, res, next) => {
  try {
    const auction = await Auction.findByIdAndUpdate(req.params.id, { status: 'suspended', suspendedBy: req.user._id, suspensionReason: req.body.reason }, { new: true });
    await ActivityLog.create({ user: req.user._id, action: 'suspend_auction', resource: 'Auction', resourceId: auction._id, details: { reason: req.body.reason }, ipAddress: req.ip });
    res.json({ success: true, data: auction });
  } catch (error) {
    next(error);
  }
});

// ---------- ORDERS & FINANCIAL ----------
router.get('/orders', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payoutStatus) filter.payoutStatus = req.query.payoutStatus;

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('buyer', 'firstName lastName email')
      .populate('client', 'companyName')
      .populate('lot', 'title lotNumber')
      .sort('-createdAt').skip(skip).limit(limit);

    res.json({ success: true, data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/refund', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    order.paymentStatus = req.body.amount >= order.totalAmount ? 'refunded' : 'partially_refunded';
    order.status = 'refunded';
    await order.save();

    await ActivityLog.create({ user: req.user._id, action: 'refund_order', resource: 'Order', resourceId: order._id, details: { amount: req.body.amount }, ipAddress: req.ip });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

router.put('/orders/:id/approve-payout', async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { payoutStatus: 'approved', payoutDate: new Date() }, { new: true });
    await ActivityLog.create({ user: req.user._id, action: 'approve_payout', resource: 'Order', resourceId: order._id, ipAddress: req.ip });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// ---------- KYC ----------
router.get('/kyc/pending', async (req, res, next) => {
  try {
    const users = await User.find({ "kyc.status": 'pending' }).sort('-kyc.submittedAt');
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.put('/kyc/:userId/approve', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { "kyc.status": 'verified' }, { new: true });
    const io = req.app.get('io');
    if (io) {
      await NotificationService.create({ recipient: user._id, type: 'kyc_approved', title: 'KYC Approved', message: 'Your identity verification has been approved.', priority: 'normal' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.put('/kyc/:userId/reject', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId, 
      { 
        "kyc.status": 'rejected',
        "kyc.rejectionReason": req.body.reason
      }, 
      { new: true }
    );
    const io = req.app.get('io');
    if (io) {
      await NotificationService.create({ recipient: user._id, type: 'kyc_rejected', title: 'KYC Rejected', message: `Your identity verification was rejected. Reason: ${req.body.reason}`, priority: 'high' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ---------- CATEGORIES ----------
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find().sort('displayOrder name');
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', [body('name').notEmpty()], validate, async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

// ---------- PAGES / CMS ----------
router.get('/pages', async (req, res, next) => {
  try {
    const pages = await Page.find().sort('-updatedAt');
    res.json({ success: true, data: pages });
  } catch (error) {
    next(error);
  }
});

router.post('/pages', [body('title').notEmpty(), body('content').notEmpty()], validate, async (req, res, next) => {
  try {
    const page = await Page.create({ ...req.body, lastEditedBy: req.user._id });
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

router.put('/pages/:id', async (req, res, next) => {
  try {
    const page = await Page.findByIdAndUpdate(req.params.id, { ...req.body, lastEditedBy: req.user._id }, { new: true });
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

router.delete('/pages/:id', async (req, res, next) => {
  try {
    await Page.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Page deleted' });
  } catch (error) {
    next(error);
  }
});

// ---------- SETTINGS ----------
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await Setting.find();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { key, value, lastUpdatedBy: req.user._id },
        { upsert: true, new: true }
      );
    }
    await ActivityLog.create({ user: req.user._id, action: 'update_settings', resource: 'Setting', details: updates, ipAddress: req.ip });
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
});

// ---------- ACTIVITY LOGS ----------
router.get('/activity-logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const total = await ActivityLog.countDocuments();
    const logs = await ActivityLog.find()
      .populate('user', 'firstName lastName email')
      .sort('-createdAt').skip(skip).limit(limit);

    res.json({ success: true, data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// ---------- REPORTS ----------
router.get('/reports', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const orderMatch = dateFilter.$gte ? { createdAt: dateFilter, paymentStatus: 'paid' } : { paymentStatus: 'paid' };

    const [revenue, userStats, auctionStats] = await Promise.all([
      Order.aggregate([
        { $match: orderMatch },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, commission: { $sum: '$commissionAmount' }, count: { $sum: 1 } } },
      ]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Auction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      data: {
        revenue: revenue[0] || { total: 0, commission: 0, count: 0 },
        userStats,
        auctionStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;