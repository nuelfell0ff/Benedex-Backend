import express from "express";

import {

  createNotification,
  getNotifications,
  markAsRead

}
  from "../controllers/notificationController.js";

import {

  protect,
  authorize

}
  from "../middleware/authMiddleware.js";

const router = express.Router();



// Admin create notification
router.post(

  "/",

  protect,

  authorize(
    "admin",
    "instructor"
  ),

  createNotification

);



// User notifications
router.get(

  "/",

  protect,

  getNotifications

);



// Mark read
router.put(

  "/:id",

  protect,

  markAsRead

);

export default router;