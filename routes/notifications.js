import express from "express";
import webpush from "web-push";
import NotificationSubscription from "../models/NotificationSubscription.js";
import { protect } from "../middleware/authMiddleware.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";

// Activity log
import ActivityLog from "../models/ActivityLog.js";
import { logAdminActivity } from "../middleware/auditLogger.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// =========================================================
// WEB PUSH CONFIGURATION
// =========================================================

webpush.setVapidDetails(
  "mailto:obaloluwaajayi2006@gmail.com",
  "BMUvDtdoxCJmJ4O_kI4zujwzYH10eO_hq357QEMh5wXZnZyjcuDTolf_wE2q6o3jMzMp4_XjFLW69xpEHmtdHR0",
  "GgZ-szRiQwa6KpLqTpSt4-K3iN0hb1V9WcrRlglr5YI"
);

// =========================================================
// ADMIN ACTIVITY LOGS
// =========================================================
//
// Supports pagination:
//
// GET /admin-logs?page=1&limit=20
// GET /admin-logs?page=2&limit=20
// GET /admin-logs?page=3&limit=20
//
// This prevents the server from sending hundreds/thousands
// of activity records to the frontend at once.
// =========================================================

router.get("/admin-logs", protect, async (req, res) => {
  try {
    // -------------------------------------------------------
    // ADMIN CHECK
    // -------------------------------------------------------

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;

    // Prevent invalid values
    if (page < 1) {
      page = 1;
    }

    // Never allow the frontend to request a huge amount
    // of records in a single request.
    if (limit < 1) {
      limit = 20;
    }

    if (limit > 20) {
      limit = 20;
    }

    const skip = (page - 1) * limit;

    // -------------------------------------------------------
    // FETCH ONLY THE CURRENT PAGE
    // -------------------------------------------------------

    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // -------------------------------------------------------
    // CHECK IF MORE RECORDS EXIST
    // -------------------------------------------------------

    /*
     * If we received exactly 20 records, there may be
     * another page.
     *
     * We perform a lightweight existence check for the next
     * record instead of loading everything.
     */
    const nextLog = await ActivityLog.findOne()
      .sort({ createdAt: -1 })
      .skip(skip + limit)
      .select("_id")
      .lean();

    const hasMore = Boolean(nextLog);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    res.status(200).json({
      success: true,
      logs,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error("Failed to fetch audit trails:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error tracking push node.",
    });
  }
});

// =========================================================
// VAPID PUBLIC KEY
// =========================================================

router.get("/vapid-key", protect, (req, res) => {
  res.status(200).json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
});

// =========================================================
// SAVE / UPDATE BROWSER PUSH SUBSCRIPTION
// =========================================================

router.post("/subscribe", protect, async (req, res) => {
  const subscription = req.body;

  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys
  ) {
    return res.status(400).json({
      message: "Invalid browser push subscription structure.",
    });
  }

  try {
    // Prevent duplicated items per endpoint configuration
    await NotificationSubscription.findOneAndUpdate(
      {
        endpoint: subscription.endpoint,
      },
      {
        user: req.user._id,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime,
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(201).json({
      success: true,
      message: "Push subscription successfully linked.",
    });
  } catch (error) {
    console.error(
      "Subscription sync database engine failure:",
      error
    );

    res.status(500).json({
      message: "Internal server error tracking push node.",
    });
  }
});

// =========================================================
// ADMIN CUSTOM BROADCAST NOTIFICATION
// =========================================================

router.post(
  "/admin-broadcast",
  protect,
  upload.single("image"),
  async (req, res) => {
    // Guard: Ensure only admins can trigger this endpoint
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message:
          "Access denied. Administrator privileges required.",
      });
    }

    const { title, body, url } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        message:
          "Notification title and body are required.",
      });
    }

    try {
      let uploadedImageUrl = null;

      // -----------------------------------------------------
      // CLOUDINARY IMAGE UPLOAD
      // -----------------------------------------------------

      if (req.file) {
        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`;

        const uploadedFile =
          await cloudinary.uploader.upload(fileBase64, {
            folder: "benedex-notifications",
            resource_type: "auto",
          });

        uploadedImageUrl = uploadedFile.secure_url;
      }

      // -----------------------------------------------------
      // FETCH ACTIVE SUBSCRIPTIONS
      // -----------------------------------------------------

      const subscriptions =
        await NotificationSubscription.find();

      if (subscriptions.length === 0) {
        return res.status(200).json({
          message:
            "No active browser devices registered to notify.",
        });
      }

      // -----------------------------------------------------
      // CREATE PUSH PAYLOAD
      // -----------------------------------------------------

      const stringifiedPayload = JSON.stringify({
        title: title,
        body: body,
        icon: "/logo192.png",
        image: uploadedImageUrl,
        data: {
          url: url || "/student",
        },
      });

      // -----------------------------------------------------
      // SEND NOTIFICATIONS
      // -----------------------------------------------------

      const sendPromises = subscriptions.map((sub) => {
        return webpush
          .sendNotification(sub, stringifiedPayload)
          .catch(async (err) => {
            if (
              err.statusCode === 410 ||
              err.statusCode === 404
            ) {
              await NotificationSubscription.deleteOne({
                _id: sub._id,
              });
            }
          });
      });

      await Promise.all(sendPromises);

      // -----------------------------------------------------
      // SECURITY AUDIT LOG
      // -----------------------------------------------------

      await logAdminActivity(
        req,
        "NOTIFICATIONS",
        "CREATE",
        `Dispatched a global web push broadcast notification to ${subscriptions.length} device nodes. Subject: "${title}".`
      );

      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      res.status(200).json({
        success: true,
        message: `Broadcast successfully dispatched to ${subscriptions.length} devices.`,
        imageUrl: uploadedImageUrl,
      });
    } catch (error) {
      console.error("Admin broadcast failure:", error);

      res.status(500).json({
        message:
          "Failed to upload image or dispatch administrator broadcast.",
      });
    }
  }
);

export default router;