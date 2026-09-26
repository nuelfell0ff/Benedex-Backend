import express from "express";
import {
  createCourse,
  getCourses,
  getSingleCourse,
  enrollCourse,
  getStudentCourses,
  getInstructorCourses,
  generateCourseFromSyllabus
} from "../controllers/courseController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// AI Syllabus Course Generator (Admin Only)
router.post(
  "/admin/generate-from-syllabus",
  protect,
  authorize("admin"),
  generateCourseFromSyllabus
);

// Create Course (Manual)
router.post("/", protect, authorize("admin", "instructor"), createCourse);

// Get all courses
router.get("/", getCourses);

// Get single course
router.get("/:id", getSingleCourse);

// Student enroll
router.post("/enroll/:courseId", protect, authorize("student"), enrollCourse);

// Get student courses
router.get("/student/registered", protect, authorize("student"), getStudentCourses);

// Get instructor courses roster mapping route
router.get("/instructor/my-courses", protect, authorize("instructor"), getInstructorCourses);

export default router;