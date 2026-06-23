import express from "express";
import {
  getAdminAnalytics,
  getPaymentTickets,        // 🆕 Imported from adminController
  resolvePaymentTicket      // 🆕 Imported from adminController
} from "../controllers/adminController.js";
import {
  protect,
  authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Existing Analytics Route
router.get(
  "/analytics",
  protect,
  authorize("admin"),
  getAdminAnalytics
);

// 🆕 Fetch all AI-generated support tickets
router.get(
  "/tickets",
  protect,
  authorize("admin"),
  getPaymentTickets
);

// 🆕 Process (Approve/Reject) a support ticket by ID
router.put(
  "/tickets/:ticketId",
  protect,
  authorize("admin"),
  resolvePaymentTicket
);

export default router;
