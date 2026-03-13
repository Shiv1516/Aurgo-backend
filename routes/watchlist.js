const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Watchlist = require('../models/Watchlist');
const Auction = require('../models/Auction');

// Get user watchlist
router.get('/', protect, async (req, res, next) => {
  try {
    const watchlist = await Watchlist.find({ user: req.user._id })
      .populate({
        path: 'auction',
        select: 'title slug coverImage status startTime endTime totalLots totalBids viewCount isFeatured',
        populate: { path: 'category', select: 'name slug' },
      })
      .populate({
        path: 'lot',
        select: 'title lotNumber images currentBid startingBid totalBids status',
      })
      .sort('-createdAt');

    res.json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
});

// Add to watchlist
router.post('/', protect, async (req, res, next) => {
  try {
    const { auctionId, lotId } = req.body;

    const existing = await Watchlist.findOne({
      user: req.user._id,
      ...(auctionId ? { auction: auctionId } : {}),
      ...(lotId ? { lot: lotId } : {}),
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Already in watchlist' });
    }

    const payload = { user: req.user._id };
    if (auctionId) payload.auction = auctionId;
    if (lotId) payload.lot = lotId;

    const watchItem = await Watchlist.create(payload);

    // Update watch count
    if (auctionId) {
      await Auction.findByIdAndUpdate(auctionId, { $inc: { watchCount: 1 } });
    }

    res.status(201).json({ success: true, data: watchItem });
  } catch (error) {
    next(error);
  }
});

// Check if in watchlist
router.get('/check/:auctionId', protect, async (req, res, next) => {
  try {
    const item = await Watchlist.findOne({
      user: req.user._id,
      auction: req.params.auctionId,
    });
    res.json({ success: true, isWatching: !!item, data: item });
  } catch (error) {
    next(error);
  }
});

// Remove from watchlist
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const item = await Watchlist.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });

    if (item.auction) {
      await Auction.findByIdAndUpdate(item.auction, { $inc: { watchCount: -1 } });
    }

    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;