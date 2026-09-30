import express from "express";

import {
  createQuiz,
  getModuleQuiz,
  getQuizById,
  submitQuiz,
  getQuizProgress,
  getAdminQuizDetails,
  updateQuiz,
} from "../controllers/quizController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("admin", "instructor"),
  createQuiz
);

router.get(
  "/admin/:quizId",
  protect,
  authorize("admin"),
  getAdminQuizDetails
);

router.put(
  "/admin/:quizId",
  protect,
  authorize("admin"),
  updateQuiz
);

router.get(
  "/progress",
  protect,
  authorize("student"),
  getQuizProgress
);

router.get(
  "/module/:moduleId",
  protect,
  authorize("student"),
  getModuleQuiz
);

router.get(
  "/:quizId",
  protect,
  authorize("student"),
  getQuizById
);

router.post(
  "/submit/:quizId",
  protect,
  authorize("student"),
  submitQuiz
);

export default router;