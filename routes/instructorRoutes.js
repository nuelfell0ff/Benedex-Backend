// routes/instructor.js
const express = require("express");
const router = express.Router();
const { getInstructorDashboardTelemetry } = require("../controllers/instructorController");
const { protect, authorize } = require("../middleware/auth"); // Your custom JWT protection layers

// Bind the consolidated analytics bundle under strict role-based firewalls
router.get(
  "/dashboard", 
  protect, 
  authorize("instructor"), 
  getInstructorDashboardTelemetry
);

module.exports = router;
