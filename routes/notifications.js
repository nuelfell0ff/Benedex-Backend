import express from 'express';
import webpush from 'web-push';
import NotificationSubscription from '../models/NotificationSubscription.js';
import { protect } from '../middleware/authMiddleware.js'; // Added .js extension

const router = express.Router();

// Initialize web-push configuration
webpush.setVapidDetails(
  'mailto:obaloluwaajayi2006@gmail.com', // Explicitly set the email string here
  'BMUvDtdoxCJmJ4O_kI4zujwzYH10eO_hq357QEMh5wXZnZyjcuDTolf_wE2q6o3jMzMp4_XjFLW69xpEHmtdHR0',
  'GgZ-szRiQwa6KpLqTpSt4-K3iN0hb1V9WcrRlglr5YI'
);

// 1. Get the public VAPID key to hand over to the client browser
router.get('/vapid-key', protect, (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// 2. Save or update a client browser subscription setup
router.post('/subscribe', protect, async (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ message: 'Invalid browser push subscription structure.' });
  }

  try {
    // Prevent duplicated items per endpoint configuration
    await NotificationSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: req.user._id, // Set by your auth middleware
        keys: subscription.keys,
        expirationTime: subscription.expirationTime
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Push subscription successfully linked.' });
  } catch (error) {
    console.error('Subscription sync database engine failure:', error);
    res.status(500).json({ message: 'Internal server error tracking push node.' });
  }
});

// Export using ES Modules default export
export default router;