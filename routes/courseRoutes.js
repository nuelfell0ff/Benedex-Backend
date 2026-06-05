import express from "express";
import {
  createCourse,
  getCourses,
  getSingleCourse,
  enrollCourse,
  getStudentCourses,
  getInstructorCourses // Imported the new function here
} from "../controllers/courseController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create Course
router.post("/", protect, authorize("admin", "instructor"), createCourse);

// Get all courses
router.get("/", getCourses);

// Get single course
router.get("/:id", getSingleCourse);

// Student enroll
router.post("/enroll/:courseId", protect, authorize("student"), enrollCourse);

// Get student courses
router.get("/student/registered", protect, authorize("student"), getStudentCourses);

// NEW: Get instructor courses roster mapping route
router.get("/instructor/my-courses", protect, authorize("instructor"), getInstructorCourses);

export default router;
