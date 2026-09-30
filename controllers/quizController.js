import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import Course from "../models/Course.js";
import { callOpenRouterAI } from "../utils/aiHelpers.js";

const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({
      message: "Administrator access required.",
    });

    return false;
  }

  return true;
};

export const generateAndSaveQuiz = async (
  moduleId,
  courseTitle,
  moduleTitle,
  apiKey,
  onProgress = () => {}
) => {
  onProgress(
    `   -> Generating quiz for module: "${moduleTitle}"...`,
    "step"
  );

  const existingQuiz = await Quiz.findOne({
    module: moduleId,
  });

  if (existingQuiz) {
    onProgress(
      `   -> Quiz already exists for module "${moduleTitle}". Skipping generation.`,
      "warning"
    );

    return existingQuiz;
  }

  const lessons = await Lesson.find({
    module: moduleId,
  }).sort({
    order: 1,
  });

  if (!lessons.length) {
    const errorMessage =
      `No lessons found for module "${moduleTitle}". Cannot generate quiz.`;

    onProgress(
      `   ! ${errorMessage}`,
      "error"
    );

    throw new Error(errorMessage);
  }

  onProgress(
    `      -> Preparing ${lessons.length} lesson(s) for quiz generation...`,
    "info"
  );

  const lessonContent = lessons
    .map(
      (lesson, index) => `
LESSON ${index + 1}

Title:
${lesson.title}

Content:
${lesson.content}
`
    )
    .join(
      "\n\n--------------------------------\n\n"
    );

  const generateQuizAttempt = async () => {
    const quizPrompt = `
You are an expert academic assessment designer.

Create a high-quality multiple-choice quiz for the module below.

COURSE:
"${courseTitle}"

MODULE:
"${moduleTitle}"

IMPORTANT:
The quiz MUST be based ONLY on the lesson content provided below.

LESSON CONTENT:
${lessonContent}

QUIZ REQUIREMENTS:

- Generate exactly 10 questions.
- Every question must be multiple-choice.
- Every question must have exactly 4 answer options.
- Each question must have exactly ONE correct answer.
- Questions must test actual understanding of the lesson content.
- Avoid questions that are unrelated to the provided lessons.
- Avoid duplicate or nearly identical questions.
- Include a mixture of:
  - definitions
  - concepts
  - applications
  - important facts
  - understanding of processes
  - relationships between concepts
- Make the questions appropriate for students studying this course.
- Make incorrect options plausible but clearly incorrect based on the lesson content.
- Do NOT make the correct answer obviously longer than the others.
- Do NOT use "All of the above".
- Do NOT use "None of the above".
- Do NOT reveal the answer inside the question.
- The correctAnswer value MUST exactly match one of the four options.
- Return ONLY valid raw JSON.
- Do NOT wrap the JSON in markdown.
- Do NOT include explanations outside the JSON.

VERY IMPORTANT JSON RULES:

- Use double quotes for every JSON property.
- Use double quotes for every string.
- Do not use trailing commas.
- Do not include comments.
- Do not include markdown.
- Do not include code fences.
- Do not include unescaped double quotes inside string values.
- Make sure every { has a matching }.
- Make sure every [ has a matching ].

REQUIRED JSON FORMAT:

{
  "title": "${moduleTitle} Quiz",
  "description": "A multiple-choice assessment covering the lessons in ${moduleTitle}.",
  "passMark": 70,
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A"
    }
  ]
}
`;

    return await callOpenRouterAI(
      quizPrompt,
      apiKey
    );
  };

  const MAX_RETRIES = 3;

  let quizData = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      onProgress(
        `      -> Quiz generation attempt ${attempt}/${MAX_RETRIES}...`,
        "step"
      );

      quizData =
        await generateQuizAttempt();

      if (
        !quizData ||
        !Array.isArray(
          quizData.questions
        )
      ) {
        throw new Error(
          "AI returned an invalid quiz structure."
        );
      }

      if (
        quizData.questions.length !== 10
      ) {
        throw new Error(
          `AI generated ${quizData.questions.length} questions instead of 10.`
        );
      }

      const validatedQuestions =
        quizData.questions.map(
          (question, index) => {
            if (
              !question.question ||
              typeof question.question !==
                "string"
            ) {
              throw new Error(
                `Question ${index + 1} is missing its question text.`
              );
            }

            if (
              !Array.isArray(
                question.options
              ) ||
              question.options.length !== 4
            ) {
              throw new Error(
                `Question ${index + 1} must contain exactly 4 options.`
              );
            }

            if (
              question.options.some(
                (option) =>
                  typeof option !==
                    "string" ||
                  !option.trim()
              )
            ) {
              throw new Error(
                `Question ${index + 1} contains an invalid option.`
              );
            }

            if (
              !question.correctAnswer ||
              typeof question.correctAnswer !==
                "string"
            ) {
              throw new Error(
                `Question ${index + 1} is missing its correct answer.`
              );
            }

            const correctAnswerExists =
              question.options.includes(
                question.correctAnswer
              );

            if (!correctAnswerExists) {
              throw new Error(
                `The correct answer for question ${
                  index + 1
                } does not match any of its options.`
              );
            }

            const uniqueOptions =
              new Set(
                question.options
              );

            if (
              uniqueOptions.size !==
              question.options.length
            ) {
              throw new Error(
                `Question ${
                  index + 1
                } contains duplicate options.`
              );
            }

            return {
              question:
                question.question.trim(),

              options:
                question.options.map(
                  (option) =>
                    option.trim()
                ),

              correctAnswer:
                question.correctAnswer.trim(),
            };
          }
        );

      quizData.questions =
        validatedQuestions;

      onProgress(
        `      + Quiz AI response validated successfully on attempt ${attempt}.`,
        "success"
      );

      break;
    } catch (error) {
      console.error(
        `      ! Quiz generation attempt ${attempt} failed:`,
        error.message
      );

      onProgress(
        `      ! Quiz generation attempt ${attempt} failed: ${error.message}`,
        "error"
      );

      if (attempt < MAX_RETRIES) {
        onProgress(
          `      -> Retrying quiz generation...`,
          "warning"
        );
      }
    }
  }

  if (!quizData) {
    const failureMessage =
      `   ! Quiz generation failed after ${MAX_RETRIES} attempts for module "${moduleTitle}".`;

    console.error(
      failureMessage
    );

    onProgress(
      `${failureMessage} Continuing without quiz.`,
      "warning"
    );

    return null;
  }

  try {
    onProgress(
      `      -> Saving generated quiz for "${moduleTitle}"...`,
      "step"
    );

    const quiz = await Quiz.create({
      title:
        quizData.title ||
        `${moduleTitle} Quiz`,

      description:
        quizData.description ||
        `A multiple-choice assessment covering the lessons in ${moduleTitle}.`,

      module: moduleId,

      passMark:
        Number(
          quizData.passMark
        ) || 70,

      questions:
        quizData.questions,
    });

    onProgress(
      `   + Quiz created successfully for module: "${moduleTitle}"`,
      "success"
    );

    return quiz;
  } catch (error) {
    console.error(
      `   ! Failed to save quiz for module "${moduleTitle}":`,
      error.message
    );

    onProgress(
      `   ! Failed to save quiz for module "${moduleTitle}": ${error.message}`,
      "warning"
    );

    return null;
  }
};

export const createQuiz = async (
  req,
  res
) => {
  try {
    const module = await Module.findById(
      req.body.module
    ).populate(
      "course",
      "title status"
    );

    if (!module) {
      return res.status(404).json({
        message: "Module not found.",
      });
    }

    const quiz = await Quiz.create({
      title: req.body.title,
      description:
        req.body.description,
      module: req.body.module,
      passMark:
        req.body.passMark || 70,
      questions:
        req.body.questions || [],
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error(
      "Create quiz error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAdminQuizDetails =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const quiz =
        await Quiz.findById(
          req.params.quizId
        )
          .populate({
            path: "module",
            populate: {
              path: "course",
              select:
                "title slug status",
            },
          })
          .lean();

      if (!quiz) {
        return res.status(404).json({
          message: "Quiz not found.",
        });
      }

      res.status(200).json(quiz);
    } catch (error) {
      console.error(
        "Admin quiz details error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateQuiz = async (
  req,
  res
) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const allowedUpdates = {};

    if (
      typeof req.body.title ===
      "string"
    ) {
      allowedUpdates.title =
        req.body.title.trim();
    }

    if (
      typeof req.body.description ===
      "string"
    ) {
      allowedUpdates.description =
        req.body.description;
    }

    if (
      req.body.passMark !== undefined
    ) {
      const passMark =
        Number(req.body.passMark);

      if (
        Number.isNaN(passMark) ||
        passMark < 0 ||
        passMark > 100
      ) {
        return res.status(400).json({
          message:
            "Pass mark must be a number between 0 and 100.",
        });
      }

      allowedUpdates.passMark =
        passMark;
    }

    if (
      Array.isArray(
        req.body.questions
      )
    ) {
      if (
        req.body.questions.length === 0
      ) {
        return res.status(400).json({
          message:
            "Quiz must contain at least one question.",
        });
      }

      for (
        let i = 0;
        i < req.body.questions.length;
        i++
      ) {
        const question =
          req.body.questions[i];

        if (
          !question.question ||
          typeof question.question !==
            "string"
        ) {
          return res.status(400).json({
            message:
              `Question ${i + 1} is missing its question text.`,
          });
        }

        if (
          !Array.isArray(
            question.options
          ) ||
          question.options.length !== 4
        ) {
          return res.status(400).json({
            message:
              `Question ${i + 1} must contain exactly 4 options.`,
          });
        }

        if (
          question.options.some(
            (option) =>
              typeof option !==
                "string" ||
              !option.trim()
          )
        ) {
          return res.status(400).json({
            message:
              `Question ${i + 1} contains an invalid option.`,
          });
        }

        if (
          !question.correctAnswer ||
          typeof question.correctAnswer !==
            "string"
        ) {
          return res.status(400).json({
            message:
              `Question ${i + 1} is missing its correct answer.`,
          });
        }

        if (
          !question.options.includes(
            question.correctAnswer
          )
        ) {
          return res.status(400).json({
            message:
              `The correct answer for question ${
                i + 1
              } must match one of the options.`,
          });
        }

        const uniqueOptions =
          new Set(
            question.options
          );

        if (
          uniqueOptions.size !==
          question.options.length
        ) {
          return res.status(400).json({
            message:
              `Question ${
                i + 1
              } contains duplicate options.`,
          });
        }
      }

      allowedUpdates.questions =
        req.body.questions.map(
          (question) => ({
            question:
              question.question.trim(),

            options:
              question.options.map(
                (option) =>
                  option.trim()
              ),

            correctAnswer:
              question.correctAnswer.trim(),
          })
        );
    }

    const quiz =
      await Quiz.findByIdAndUpdate(
        req.params.quizId,
        {
          $set: allowedUpdates,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found.",
      });
    }

    res.status(200).json({
      message:
        "Quiz updated successfully.",
      quiz,
    });
  } catch (error) {
    console.error(
      "Update quiz error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getModuleQuiz = async (
  req,
  res
) => {
  try {
    const module =
      await Module.findById(
        req.params.moduleId
      ).select("course");

    if (!module) {
      return res.status(404).json({
        message: "Module not found.",
      });
    }

    const course =
      await Course.findOne({
        _id: module.course,
        status: "published",
      }).select(
        "_id title status"
      );

    if (!course) {
      return res.status(404).json({
        message:
          "Course not found or is not currently published.",
      });
    }

    const quiz =
      await Quiz.findOne({
        module: module._id,
      });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    res.json(quiz);
  } catch (error) {
    console.error(
      "Get module quiz error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getQuizById = async (
  req,
  res
) => {
  try {
    const quiz =
      await Quiz.findById(
        req.params.quizId
      ).populate({
        path: "module",
        select: "course",
      });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    const course =
      await Course.findOne({
        _id: quiz.module?.course,
        status: "published",
      }).select(
        "_id title status"
      );

    if (!course) {
      return res.status(404).json({
        message:
          "Quiz not found or its course is not currently published.",
      });
    }

    res.json(quiz);
  } catch (error) {
    console.error(
      "Get quiz by ID error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

export const submitQuiz = async (
  req,
  res
) => {
  try {
    const quiz =
      await Quiz.findById(
        req.params.quizId
      ).populate({
        path: "module",
        select: "course",
      });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    const course =
      await Course.findOne({
        _id: quiz.module?.course,
        status: "published",
      }).select(
        "_id title status"
      );

    if (!course) {
      return res.status(403).json({
        message:
          "This quiz cannot be submitted because its course has not been published.",
      });
    }

    const answers =
      req.body.answers || {};

    let correct = 0;

    quiz.questions.forEach(
      (question, index) => {
        if (
          answers[index] ===
          question.correctAnswer
        ) {
          correct++;
        }
      }
    );

    const percentage =
      quiz.questions.length > 0
        ? Math.round(
            (correct /
              quiz.questions.length) *
              100
          )
        : 0;

    const passed =
      percentage >=
      quiz.passMark;

    const attempt =
      await QuizAttempt.create({
        student:
          req.user._id,

        quiz: quiz._id,

        score: percentage,

        passed,
      });

    res.json({
      score: percentage,
      correct,
      total:
        quiz.questions.length,
      passed,
      attempt,
    });
  } catch (error) {
    console.error(
      "Submit quiz error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getQuizProgress = async (
  req,
  res
) => {
  try {
    const allAttempts =
      await QuizAttempt.find({
        student: req.user._id,
      });

    res.json(allAttempts);
  } catch (error) {
    console.error(
      "Get quiz progress error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};