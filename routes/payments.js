const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const NotificationService = require('../services/notificationService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/create-intent', protect, async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate('lot', 'title');
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, error: 'Order already paid' });
    }

    // Mock payment intent for testing with placeholder keys
    let paymentIntent;
    if (process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' || !process.env.STRIPE_SECRET_KEY) {
      console.log('Using mock payment intent due to placeholder/missing Stripe key');
      paymentIntent = {
        id: 'pi_mock_' + Date.now(),
        client_secret: 'pi_mock_secret_' + Date.now(),
      };
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // cents
        currency: 'usd',
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        },
        description: `Augeo Auction - ${order.orderNumber}`,
      });
    }

    order.stripePaymentIntentId = paymentIntent.id;
    order.paymentStatus = 'processing';
    await order.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    next(error);
  }
});

// Confirm payment
router.post('/confirm', protect, async (req, res, next) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let isSucceeded = false;
    let chargeId = null;

    if (paymentIntentId && paymentIntentId.startsWith('pi_mock_')) {
      isSucceeded = true;
      chargeId = 'ch_mock_' + Date.now();
    } else {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      isSucceeded = paymentIntent.status === 'succeeded';
      chargeId = paymentIntent.latest_charge;
    }

    if (isSucceeded) {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.paidAt = new Date();
      order.stripeChargeId = chargeId;
      await order.save();

      // Send payment confirmation notification
      const io = req.app.get('io');
      if (io) {
        await NotificationService.notifyPaymentConfirmed(io, order.buyer, order);
      }

      res.json({ success: true, data: order });
    } else {
      order.paymentStatus = 'failed';
      await order.save();
      res.status(400).json({ success: false, error: 'Payment not successful', status: 'failed' });
    }
  } catch (error) {
    next(error);
  }
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'confirmed';
          order.paidAt = new Date();
          order.stripeChargeId = paymentIntent.latest_charge;
          await order.save();
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;