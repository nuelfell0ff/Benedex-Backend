import express from "express";

import {
  initializePayment,
  verifyPayment,
  getAllPaymentsForAdmin,
} from "../controllers/paymentController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// INITIALIZE PAYMENT
// Authenticated users can initialize payments
// ==========================================

router.post(
  "/initialize",
  protect,
  initializePayment
);

// ==========================================
// ADMIN PAYMENT REGISTRY
// ONLY ADMINS CAN VIEW ALL PAYMENTS
// ==========================================

router.get(
  "/all",
  protect,
  authorize("admin"),
  getAllPaymentsForAdmin
);

// ==========================================
// VERIFY PAYMENT
// Authenticated users can verify their payment
// ==========================================

router.get(
  "/verify/:reference",
  protect,
  verifyPayment
);

export default router;