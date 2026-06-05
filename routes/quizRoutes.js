import express from "express";
import {
  createQuiz,
  getModuleQuiz,
  getQuizById,
  submitQuiz,
  getQuizProgress, // 1. Import your new function here
} from "../controllers/quizController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CREATE */
router.post("/", protect, authorize("admin", "instructor"), createQuiz);

/* PROGRESS TRACKING */
// 2. Place this ABOVE the dynamic /:quizId route!
router.get("/progress", protect, authorize("student"), getQuizProgress);

/* GET BY MODULE */
router.get("/module/:moduleId", protect, getModuleQuiz);

/* GET BY QUIZ ID */
router.get("/:quizId", protect, getQuizById);

/* SUBMIT */
router.post("/submit/:quizId", protect, authorize("student"), submitQuiz);

export default router;
