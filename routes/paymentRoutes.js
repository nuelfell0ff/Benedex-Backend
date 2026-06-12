import express from "express";

import {

initializePayment,
verifyPayment,
getAllPaymentsForAdmin

}
from "../controllers/paymentController.js";

import {
protect
}
from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
"/initialize",
protect,
initializePayment
);


router.get(
  "/all",
  protect, // Checks your JWT token
  getAllPaymentsForAdmin
);

router.get(
"/verify/:reference",
protect,
verifyPayment
);

export default router;
