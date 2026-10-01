import Lesson from "../models/Lesson.js";
import LessonProgress from "../models/LessonProgress.js";
import Module from "../models/Module.js";
import Course from "../models/Course.js";

import {
  recordLearningActivity,
} from "../utils/studentLearning.js";

import {
  callOpenRouterAI,
  fetchUnsplashImage,
} from "../utils/aiHelpers.js";

const ensureAdmin = (req, res) => {
  if (
    !req.user ||
    req.user.role !== "admin"
  ) {
    res.status(403).json({
      message:
        "Administrator access required.",
    });

    return false;
  }

  return true;
};

const generateLessonContent = async (
  lessonTitle,
  courseTitle,
  moduleTitle,
  apiKey,
  attempt = 1
) => {
  const lessonPrompt = `
You are an expert medical educator, academic textbook author, curriculum designer, and university-level instructor.

Create a comprehensive, high-quality lesson for a professional paid medical education course.

COURSE:
"${courseTitle}"

MODULE:
"${moduleTitle}"

LESSON:
"${lessonTitle}"

Your job is to teach this topic thoroughly, accurately, and clearly.

This is NOT a short blog post, quick explanation, or study note.

The lesson must feel like a genuine university-level course lesson that a student could study from independently.

CONTENT REQUIREMENTS:

- Write approximately 1,200–1,800 words.
- Do not intentionally make the lesson short.
- Cover the topic thoroughly without unnecessary repetition.
- Use accurate medical and scientific terminology.
- Explain difficult terminology in simple language when it is first introduced.
- Assume the student may be learning the topic for the first time.
- Build the explanation progressively from foundational concepts to more advanced concepts.
- Explain important mechanisms, processes, structures, relationships, and functions in detail where relevant.
- Use clinically relevant examples whenever appropriate.
- Explain why the topic matters in real healthcare practice.
- Connect theoretical concepts to real-world medical situations where appropriate.
- Include important distinctions between commonly confused concepts.
- Mention important clinical implications where relevant.
- Include examples, scenarios, or brief case-based applications where they genuinely improve understanding.
- Do not invent medical facts.
- Do not provide dangerous or irresponsible medical advice.
- Do not assume the learner already has advanced medical knowledge.

The lesson should be substantial enough to be used as the primary reading material for this topic.

STRUCTURE THE LESSON LIKE THIS:

# ${lessonTitle}

## Introduction

Introduce the topic and explain why it is important in anatomy, physiology, medicine, healthcare, or the relevant medical discipline.

## Learning Objectives

Provide 4–6 clear learning objectives describing what the student should understand after completing the lesson.

## Core Concepts

Provide a detailed explanation of the fundamental concepts necessary to understand the topic.

Use appropriate subsections with ### headings.

## Detailed Explanation

Teach the topic thoroughly.

Break complex ideas into logical sections.

Use:

- Clear explanations
- Bullet points where useful
- Numbered steps for processes
- Tables when comparisons are genuinely useful
- Examples where appropriate

Do not turn the entire lesson into bullet points. Most of the lesson should be proper educational prose.

## Clinical Relevance

Explain how the topic connects to real healthcare practice.

Where appropriate, discuss:

- Common clinical conditions
- Symptoms or physiological changes
- Diagnostic relevance
- Treatment relevance
- Patient-care relevance
- Important clinical observations

Only include clinical information that is genuinely relevant to the lesson.

## Applied Example or Clinical Scenario

Provide at least one realistic educational example or short clinical scenario when appropriate.

Explain how the concepts taught in the lesson apply to that scenario.

## Common Misconceptions

Identify 2–4 common misunderstandings students may have about this topic and explain the correct understanding.

## Key Terms

List and briefly define the most important terminology introduced in the lesson.

## Key Takeaways

Provide 6–10 concise but meaningful points summarizing the most important things the student should remember.

QUALITY REQUIREMENTS:

- Do not pad the lesson with meaningless sentences just to increase word count.
- Do not repeat the same explanation using different wording.
- Do not generate generic filler.
- Do not discuss the course syllabus.
- Do not discuss other lessons unless a brief connection is genuinely necessary.
- Stay focused on "${lessonTitle}".
- Do not generate another lesson.
- Do not create assignments or quizzes.
- Do not mention that you are an AI.
- Do not mention these instructions.

OUTPUT FORMAT:

Return ONLY the complete lesson as Markdown.

Do NOT return JSON.

Do NOT return an object.

Do NOT return fields such as:

"title"
"content"
"markdownContent"
"imageSearchTerm"

The first line must be:

# ${lessonTitle}

Then continue with the complete lesson.
`;

  try {
    const markdownContent =
      await callOpenRouterAI(
        lessonPrompt,
        apiKey,
        {
          returnRaw: true,
        }
      );

    if (
      !markdownContent ||
      !markdownContent.trim()
    ) {
      throw new Error(
        "AI returned empty lesson content."
      );
    }

    return markdownContent.trim();
  } catch (error) {
    if (attempt < 2) {
      console.warn(
        `⚠️ Lesson generation failed for "${lessonTitle}". Retrying...`
      );

      return generateLessonContent(
        lessonTitle,
        courseTitle,
        moduleTitle,
        apiKey,
        attempt + 1
      );
    }

    throw error;
  }
};

export const generateAndSaveLessons =
  async (
    moduleId,
    courseTitle,
    moduleTitle,
    lessonTitles,
    apiKey,
    onProgress = () => {}
  ) => {
    try {
      const titles = Array.isArray(
        lessonTitles
      )
        ? lessonTitles
            .map((title) =>
              typeof title === "string"
                ? title.trim()
                : ""
            )
            .filter(Boolean)
        : [];

      if (titles.length === 0) {
        onProgress(
          `   ! No lesson titles found for "${moduleTitle}".`,
          "error"
        );

        return;
      }

      onProgress(
        `   -> Generating ${titles.length} lessons for module: "${moduleTitle}"...`,
        "step"
      );

      let lessonOrder = 1;

      for (const lessonTitle of titles) {
        const currentLesson =
          lessonOrder;

        const totalLessons =
          titles.length;

        onProgress(
          `      -> Generating lesson ${currentLesson}/${totalLessons}: "${lessonTitle}"...`,
          "step"
        );

        const markdownContent =
          await generateLessonContent(
            lessonTitle,
            courseTitle,
            moduleTitle,
            apiKey
          );

        onProgress(
          `         -> Finding cover image for "${lessonTitle}"...`,
          "step"
        );

        const heroImageData =
          await fetchUnsplashImage(
            lessonTitle
          );

        onProgress(
          `         -> Saving lesson "${lessonTitle}"...`,
          "step"
        );

        await Lesson.create({
          title: lessonTitle,
          type: "text",
          content: markdownContent,
          illustrationUrl:
            heroImageData.url,
          photographerName:
            heroImageData.photographerName,
          photographerUrl:
            heroImageData.photographerUrl,
          module: moduleId,
          order: lessonOrder,
          isPreview:
            lessonOrder === 1,
        });

        onProgress(
          `         + Lesson ${currentLesson}/${totalLessons} saved successfully: "${lessonTitle}"`,
          "success"
        );

        lessonOrder++;
      }

      onProgress(
        `   + All ${titles.length} lessons generated for "${moduleTitle}".`,
        "success"
      );
    } catch (error) {
      onProgress(
        `   ! Failed to generate lessons for "${moduleTitle}": ${error.message}`,
        "error"
      );

      console.error(
        `Failed to generate lessons for module "${moduleTitle}":`,
        error
      );

      throw error;
    }
  };

export const createLesson = async (
  req,
  res
) => {
  try {
    const lesson =
      await Lesson.create({
        title: req.body.title,
        type:
          req.body.type || "text",
        content:
          req.body.content,
        videoUrl:
          req.body.videoUrl,
        documentUrl:
          req.body.documentUrl,
        illustrationUrl:
          req.body.illustrationUrl,
        photographerName:
          req.body.photographerName,
        photographerUrl:
          req.body.photographerUrl,
        module:
          req.body.module,
        order:
          req.body.order,
        isPreview:
          req.body.isPreview || false,
      });

    res.status(201).json(
      lesson
    );
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getModuleLessons =
  async (req, res) => {
    try {
      const module =
        await Module.findById(
          req.params.moduleId
        ).select(
          "course title"
        );

      if (!module) {
        return res.status(404).json({
          message:
            "Module not found.",
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

      const lessons =
        await Lesson.find({
          module: module._id,
        }).sort({
          order: 1,
        });

      res.json(lessons);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getAdminLessonDetails =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const lesson =
        await Lesson.findById(
          req.params.id
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

      if (!lesson) {
        return res.status(404).json({
          message:
            "Lesson not found.",
        });
      }

      res.status(200).json(
        lesson
      );
    } catch (error) {
      console.error(
        "Admin lesson details error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateLesson = async (
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
      typeof req.body.type ===
      "string"
    ) {
      allowedUpdates.type =
        req.body.type;
    }

    if (
      typeof req.body.content ===
      "string"
    ) {
      allowedUpdates.content =
        req.body.content;
    }

    if (
      typeof req.body.videoUrl ===
      "string"
    ) {
      allowedUpdates.videoUrl =
        req.body.videoUrl;
    }

    if (
      typeof req.body.documentUrl ===
      "string"
    ) {
      allowedUpdates.documentUrl =
        req.body.documentUrl;
    }

    if (
      typeof req.body.illustrationUrl ===
      "string"
    ) {
      allowedUpdates.illustrationUrl =
        req.body.illustrationUrl;
    }

    if (
      typeof req.body.photographerName ===
      "string"
    ) {
      allowedUpdates.photographerName =
        req.body.photographerName;
    }

    if (
      typeof req.body.photographerUrl ===
      "string"
    ) {
      allowedUpdates.photographerUrl =
        req.body.photographerUrl;
    }

    if (
      req.body.order !==
      undefined
    ) {
      allowedUpdates.order =
        Number(req.body.order) || 1;
    }

    if (
      req.body.isPreview !==
      undefined
    ) {
      allowedUpdates.isPreview =
        Boolean(
          req.body.isPreview
        );
    }

    const lesson =
      await Lesson.findByIdAndUpdate(
        req.params.id,
        {
          $set: allowedUpdates,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!lesson) {
      return res.status(404).json({
        message:
          "Lesson not found.",
      });
    }

    res.status(200).json({
      message:
        "Lesson updated successfully.",
      lesson,
    });
  } catch (error) {
    console.error(
      "Update lesson error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

export const completeLesson =
  async (req, res) => {
    try {
      const lessonId =
        req.params.lessonId;

      const studentId =
        req.user._id;

      const lesson =
        await Lesson.findById(
          lessonId
        ).populate({
          path: "module",
          populate: {
            path: "course",
            select:
              "title status",
          },
        });

      if (!lesson) {
        return res.status(404).json({
          message:
            "Lesson not found.",
        });
      }

      const course =
        lesson.module?.course;

      if (
        !course ||
        course.status !==
          "published"
      ) {
        return res.status(403).json({
          message:
            "This lesson is not available because its course has not been published.",
        });
      }

      const existingProgress =
        await LessonProgress.findOne({
          student: studentId,
          lesson: lessonId,
        });

      if (
        existingProgress?.completed ===
        true
      ) {
        return res.status(200).json({
          message:
            "Lesson already completed",
          progress:
            existingProgress,
        });
      }

      const progress =
        await LessonProgress.findOneAndUpdate(
          {
            student: studentId,
            lesson: lessonId,
          },
          {
            $set: {
              completed: true,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

      await recordLearningActivity({
        student: studentId,
        type:
          "lesson_completed",
        title: `Completed ${
          lesson.title ||
          "Lesson"
        }`,
        points: 5,
      });

      return res.status(200).json({
        message:
          "Lesson completed",
        progress,
      });
    } catch (error) {
      console.error(
        "Error completing lesson:",
        error
      );

      return res.status(500).json({
        message: error.message,
      });
    }
  };

export const getLessonProgress =
  async (req, res) => {
    try {
      const progress =
        await LessonProgress.find({
          student: req.user._id,
          completed: true,
        }).populate(
          "lesson"
        );

      res.json(progress);
    } catch (error) {
      console.error(
        "Error fetching lesson progress:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };