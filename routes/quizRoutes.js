import express from "express";

import {

createQuiz,
getModuleQuiz,
submitQuiz

}
from "../controllers/quizController.js";

import {

protect,
authorize

}
from "../middleware/authMiddleware.js";

const router =
express.Router();


// Create Quiz
router.post(
"/",
protect,
authorize(
"admin",
"instructor"
),
createQuiz
);


// Get Quiz
router.get(
"/module/:moduleId",
protect,
getModuleQuiz
);


// Submit Quiz
router.post(
"/submit/:quizId",
protect,
authorize(
"student"
),
submitQuiz
);

export default router;
