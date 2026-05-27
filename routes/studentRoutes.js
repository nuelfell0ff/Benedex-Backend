import express from "express";

import {
  studentDashboard,
  adminDashboard
}
  from "../controllers/studentController.js";

import {
  protect,
  authorize
}
  from "../middleware/authMiddleware.js";

const router = express.Router();


router.get(
  "/dashboard",
  protect,
  studentDashboard
);


router.get(
  "/admin",
  protect,
  authorize("admin"),
  adminDashboard
);

export default router;