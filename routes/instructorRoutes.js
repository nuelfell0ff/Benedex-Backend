// routes/instructor.js
import express from "express";
import { getInstructorDashboardTelemetry } from "../controllers/instructorController.js";
import { protect, authorize } from "../middleware/authMiddleware.js"; // Ensure .js is present on local files

const router = express.Router();

// Bind the consolidated analytics bundle under strict role-based firewalls
router.get(
  "/dashboard", 
  protect, 
  authorize("instructor"), 
  getInstructorDashboardTelemetry
);

export default router;
