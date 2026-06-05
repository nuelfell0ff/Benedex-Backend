import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";

/* CREATE QUIZ */
export const createQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.create({
      title: req.body.title,
      description: req.body.description,
      module: req.body.module,
      passMark: req.body.passMark || 70,
      questions: req.body.questions || [],
    });

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* GET QUIZ BY MODULE */
export const getModuleQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      module: req.params.moduleId,
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* GET QUIZ BY ID */
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(
      req.params.quizId
    );

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* SUBMIT QUIZ */
export const submitQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(
      req.params.quizId
    );

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    const answers = req.body.answers || {};

    let correct = 0;

    quiz.questions.forEach((q, index) => {
      if (
        answers[index] === q.correctAnswer
      ) {
        correct++;
      }
    });

    const percentage = Math.round(
      (correct / quiz.questions.length) * 100
    );

    const passed =
      percentage >= quiz.passMark;

    const attempt =
      await QuizAttempt.create({
        student: req.user._id,
        quiz: quiz._id,
        score: percentage,
        passed,
      });

    res.json({
      score: percentage,
      correct,
      total: quiz.questions.length,
      passed,
      attempt,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


/* GET STUDENT QUIZZES PROGRESS */
export const getQuizProgress = async (req, res) => {
  try {
    // Find all attempts by this student where they successfully passed
    const passedAttempts = await QuizAttempt.find({
      student: req.user._id,
      passed: true
    }).select("quiz passed"); // Optimization: only fetch fields we need

    res.json(passedAttempts);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
