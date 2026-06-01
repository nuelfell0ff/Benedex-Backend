import express from "express";

import {
  studentDashboard,
  clearStudentActivityViews,
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

router.put(
  "/dashboard/activities/viewed",
  protect,
  authorize("student"),
  clearStudentActivityViews
);


router.get(
  "/admin",
  protect,
  authorize("admin"),
  adminDashboard
);

export default router;