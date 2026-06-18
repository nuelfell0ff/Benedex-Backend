import express from "express";

import {
  studentDashboard,
  clearStudentActivityViews,
  adminDashboard
} from "../controllers/studentController.js";

import {
  protect,
  authorize,
  checkMaintenance // Imported here
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Student dashboard endpoint (Protected by maintenance check)
router.get(
  "/dashboard",
  protect,
  checkMaintenance,
  studentDashboard
);

// Student activity cleanup endpoint (Protected by maintenance check)
router.put(
  "/dashboard/activities/viewed",
  protect,
  authorize("student"),
  checkMaintenance,
  clearStudentActivityViews
);

// Administrative access endpoint (Bypasses maintenance check entirely)
router.get(
  "/admin",
  protect,
  authorize("admin"),
  adminDashboard
);

export default router;
