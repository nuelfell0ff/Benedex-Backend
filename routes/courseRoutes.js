import express from "express";

import {
  createCourse,
  getCourses,
  getPublishedCourses,
  getSingleCourse,
  enrollCourse,
  getStudentCourses,
  getInstructorCourses,
  generateCourseFromSyllabus,
  getAdminCourseStructure,
  updateCourse,
  publishCourse,
} from "../controllers/courseController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/admin/generate-from-syllabus",
  protect,
  authorize("admin"),
  generateCourseFromSyllabus
);

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getCourses
);

router.get(
  "/admin/:id/structure",
  protect,
  authorize("admin"),
  getAdminCourseStructure
);

router.put(
  "/admin/:id",
  protect,
  authorize("admin"),
  updateCourse
);

router.patch(
  "/admin/:id/publish",
  protect,
  authorize("admin"),
  publishCourse
);

router.post(
  "/",
  protect,
  authorize("admin", "instructor"),
  createCourse
);

router.get(
  "/",
  protect,
  authorize("student"),
  getPublishedCourses
);

router.post(
  "/enroll/:courseId",
  protect,
  authorize("student"),
  enrollCourse
);

router.get(
  "/student/registered",
  protect,
  authorize("student"),
  getStudentCourses
);

router.get(
  "/instructor/my-courses",
  protect,
  authorize("instructor"),
  getInstructorCourses
);

router.get(
  "/:id",
  protect,
  getSingleCourse
);

export default router;