import express from 'express';
import webpush from 'web-push';
import NotificationSubscription from '../models/NotificationSubscription.js';
import { protect } from '../middleware/authMiddleware.js'; 
import cloudinary from '../config/cloudinary.js'; 
import multer from 'multer'; 

// 👇 1. IMPORT YOUR ACTIVITY LOG MODEL & LOGGER UTILITY HERE
import ActivityLog from '../models/ActivityLog.js';
import { logAdminActivity } from '../middleware/auditLogger.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize web-push configuration
webpush.setVapidDetails(
  'mailto:obaloluwaajayi2006@gmail.com', 
  'BMUvDtdoxCJmJ4O_kI4zujwzYH10eO_hq357QEMh5wXZnZyjcuDTolf_wE2q6o3jMzMp4_XjFLW69xpEHmtdHR0',
  'GgZ-szRiQwa6KpLqTpSt4-K3iN0hb1V9WcrRlglr5YI'
);

// 👇 2. NEW ENDPOINT: FETCH ALL SYSTEM LOGS FOR YOUR NEW FRONTEND PAGE
// This fixes the 404 error your browser console was throwing!
router.get('/admin-logs', protect, async (req, res) => {
  try {
    // Guard: Only let verified admins view the security trail
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    // Fetch the 100 most recent logs from the DB
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Failed to fetch audit trails:', error);
    res.status(500).json({ success: false, message: 'Internal server error tracking push node.' });
  }
});

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
        user: req.user._id, 
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
      
      uploadedImageUrl = uploadedFile.secure_url; 
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
      image: uploadedImageUrl, 
      data: {
        url: url || '/student'
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

    // 🛡️ SECURITY AUDIT TRAIL: Track who blasted this broadcast across the platform!
    await logAdminActivity(
      req,
      "NOTIFICATIONS",
      "CREATE",
      `Dispatched a global web push broadcast notification to ${subscriptions.length} device nodes. Subject: "${title}".`
    );

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

export default router;