import express from "express";

import {
  createLesson,
  getModuleLessons,
  completeLesson,
  getLessonProgress,
  getAdminLessonDetails,
  updateLesson,
} from "../controllers/lessonController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("admin", "instructor"),
  createLesson
);

router.get(
  "/admin/:id",
  protect,
  authorize("admin"),
  getAdminLessonDetails
);

router.put(
  "/admin/:id",
  protect,
  authorize("admin"),
  updateLesson
);

router.get(
  "/module/:moduleId",
  protect,
  authorize("student"),
  getModuleLessons
);

router.post(
  "/complete/:lessonId",
  protect,
  authorize("student"),
  completeLesson
);

router.get(
  "/progress",
  protect,
  authorize("student"),
  getLessonProgress
);

export default router;