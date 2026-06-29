import express from 'express';
import webpush from 'web-push';
import NotificationSubscription from '../models/NotificationSubscription.js';
import { protect } from '../middleware/authMiddleware.js'; // Added .js extension
import cloudinary from '../config/cloudinary.js'; // 1. Import your Cloudinary config
import multer from 'multer'; // 2. Import multer for file handling

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

// 3. Admin Custom Broadcast Notification (With Auto Cloudinary Upload)
// We add 'upload.single("image")' to capture the file input from the admin form
router.post('/admin-broadcast', protect, upload.single('image'), async (req, res) => {
  // Guard: Ensure only admins can trigger this endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }

  const { title, body, url } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: 'Notification title and body are required.' });
  }

  try {
    let uploadedImageUrl = null;

    // If an image file was attached to the request form data, upload it to your folder
    if (req.file) {
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const uploadedFile = await cloudinary.uploader.upload(fileBase64, {
        folder: "benedex-notifications",
        resource_type: "auto"
      });
      
      uploadedImageUrl = uploadedFile.secure_url; // Grab the hosted secure URL string
    }

    // Fetch all active browser tracking configurations
    const subscriptions = await NotificationSubscription.find();

    if (subscriptions.length === 0) {
      return res.status(200).json({ message: 'No active browser devices registered to notify.' });
    }

    const stringifiedPayload = JSON.stringify({
      title: title,
      body: body,
      icon: '/logo192.png', 
      image: uploadedImageUrl, // Large banner image passed seamlessly to the worker configuration
      data: {
        url: url || '/student/dashboard'
      }
    });

    // Broadcast the payload out to every live channel asynchronously
    const sendPromises = subscriptions.map(sub => {
      return webpush.sendNotification(sub, stringifiedPayload)
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await NotificationSubscription.deleteOne({ _id: sub._id });
          }
        });
    });

    await Promise.all(sendPromises);

    res.status(200).json({ 
      success: true, 
      message: `Broadcast successfully dispatched to ${subscriptions.length} devices.`,
      imageUrl: uploadedImageUrl 
    });

  } catch (error) {
    console.error('Admin broadcast failure:', error);
    res.status(500).json({ message: 'Failed to upload image or dispatch administrator broadcast.' });
  }
});
// Export using ES Modules default export
export default router;
