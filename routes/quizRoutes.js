import express from "express";

import {
  createQuiz,
  getModuleQuiz,
  getQuizById,
  submitQuiz,
} from "../controllers/quizController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* CREATE */
router.post(
  "/",
  protect,
  authorize("admin", "instructor"),
  createQuiz
);

/* GET BY MODULE */
router.get(
  "/module/:moduleId",
  protect,
  getModuleQuiz
);

/* GET BY QUIZ ID */
router.get(
  "/:quizId",
  protect,
  getQuizById
);

/* SUBMIT */
router.post(
  "/submit/:quizId",
  protect,
  authorize("student"),
  submitQuiz
);

export default router;
