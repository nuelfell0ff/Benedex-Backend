import express from "express";

import {
  createLesson,
  getModuleLessons,
  completeLesson,
  getLessonProgress
} from "../controllers/lessonController.js";

import {
  protect,
  authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();


// CREATE LESSON
router.post(
  "/",
  protect,
  authorize("admin", "instructor"),
  createLesson
);


// GET LESSONS BY MODULE
router.get(
  "/module/:moduleId",
  protect,
  getModuleLessons
);


// COMPLETE LESSON
router.post(
  "/complete/:lessonId",
  protect,
  authorize("student"),
  completeLesson
);


// GET PROGRESS
router.get(
  "/progress",
  protect,
  getLessonProgress
);

export default router;
