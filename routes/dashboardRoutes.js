import express from "express";
import {
  getStudentDashboard,
  getInstructorOverview,
  getInstructorCourses,
  getInstructorEngagement,
  getInstructorAtRisk
} from "../controllers/dashboardController.js";
import { protect, authorize } from "../middleware/authMiddleware.js"; // Import protect and authorize

const router = express.Router();

// Existing Student Route
router.get("/student", protect, getStudentDashboard);

// --- NEW INSTRUCTOR ROUTES ---
// Pass "instructor" into your authorize middleware to block unauthorized students
router.get("/analytics/overview", protect, authorize("instructor"), getInstructorOverview);
router.get("/courses", protect, authorize("instructor"), getInstructorCourses);
router.get("/analytics/weekly-engagement", protect, authorize("instructor"), getInstructorEngagement);
router.get("/analytics/students-at-risk", protect, authorize("instructor"), getInstructorAtRisk);

export default router;
