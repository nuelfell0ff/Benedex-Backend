import express from "express";
import {
  getStudentDashboard,
  getInstructorOverview,
  getInstructorCourses,
  getInstructorEngagement,
  getInstructorAtRisk
} from "../controllers/dashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js"; // Assuming you have role checks

const router = express.Router();

// Existing Student Route
router.get("/student", protect, getStudentDashboard);

// --- NEW INSTRUCTOR ROUTES ---
// These match the exact paths your React frontend is trying to Axios-fetch
router.get("/analytics/overview", protect, restrictTo("instructor"), getInstructorOverview);
router.get("/courses", protect, restrictTo("instructor"), getInstructorCourses);
router.get("/analytics/weekly-engagement", protect, restrictTo("instructor"), getInstructorEngagement);
router.get("/analytics/students-at-risk", protect, restrictTo("instructor"), getInstructorAtRisk);

export default router;
