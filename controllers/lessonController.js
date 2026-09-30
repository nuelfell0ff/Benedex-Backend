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
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({
      message: "Administrator access required.",
    });

    return false;
  }

  return true;
};

export const generateAndSaveLessons = async (
  moduleId,
  courseTitle,
  moduleTitle,
  lessonTitles,
  apiKey,
  onProgress = () => {}
) => {
  try {
    const titles = Array.isArray(lessonTitles)
      ? lessonTitles.filter(Boolean)
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
      const currentLesson = lessonOrder;
      const totalLessons = titles.length;

      onProgress(
        `      -> Generating lesson ${currentLesson}/${totalLessons}: "${lessonTitle}"...`,
        "step"
      );

      const lessonPrompt = `
You are an expert textbook author and professional course instructor.

Create ONE comprehensive, textbook-grade lesson for the course below.

COURSE:
"${courseTitle}"

MODULE:
"${moduleTitle}"

LESSON:
"${lessonTitle}"

DIRECTIVES:

- Write approximately 500-700 words.
- Make the lesson educational and technically accurate.
- Make it beginner-friendly where appropriate.
- Explain important concepts clearly.
- Use Markdown formatting.
- Start with a strong introduction.
- Use appropriate ## and ### headings.
- Include definitions where necessary.
- Include practical examples where useful.
- Include bullet points or numbered lists where useful.
- Include a section explaining practical application.
- Include a concise "Key Takeaways" section.
- Focus ONLY on the lesson titled "${lessonTitle}".
- Do not generate another lesson.
- Do not discuss the course syllabus.
- Do not discuss other lessons.

TECHNICAL CONTENT:

If the lesson involves programming or technical concepts, include useful code examples where appropriate.

Code examples may contain:

- quotation marks
- apostrophes
- curly braces
- square brackets
- parentheses
- backticks
- JSX
- JavaScript
- HTML
- CSS
- JSON
- URLs

Write those examples naturally and correctly.

OUTPUT REQUIREMENT:

Return ONLY the lesson itself as Markdown.

DO NOT return JSON.

DO NOT return an object.

DO NOT return fields such as:
"title"
"markdownContent"
"imageSearchTerm"

DO NOT include explanations before or after the lesson.

The first line must be:

# ${lessonTitle}

Then continue with the complete lesson.
`;

      const markdownContent = await callOpenRouterAI(
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
          `AI returned no lesson content for "${lessonTitle}".`
        );
      }

      onProgress(
        `         -> Finding cover image for "${lessonTitle}"...`,
        "step"
      );

      const heroImageData =
        await fetchUnsplashImage(lessonTitle);

      onProgress(
        `         -> Saving lesson "${lessonTitle}"...`,
        "step"
      );

      await Lesson.create({
        title: lessonTitle,
        type: "text",
        content: markdownContent,
        illustrationUrl: heroImageData.url,
        photographerName:
          heroImageData.photographerName,
        photographerUrl:
          heroImageData.photographerUrl,
        module: moduleId,
        order: lessonOrder,
        isPreview: lessonOrder === 1,
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

export const createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create({
      title: req.body.title,
      type: req.body.type || "text",
      content: req.body.content,
      videoUrl: req.body.videoUrl,
      documentUrl: req.body.documentUrl,
      illustrationUrl: req.body.illustrationUrl,
      photographerName: req.body.photographerName,
      photographerUrl: req.body.photographerUrl,
      module: req.body.module,
      order: req.body.order,
      isPreview: req.body.isPreview || false,
    });

    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getModuleLessons = async (req, res) => {
  try {
    const module = await Module.findById(
      req.params.moduleId
    ).select("course title");

    if (!module) {
      return res.status(404).json({
        message: "Module not found.",
      });
    }

    const course = await Course.findOne({
      _id: module.course,
      status: "published",
    }).select("_id title status");

    if (!course) {
      return res.status(404).json({
        message:
          "Course not found or is not currently published.",
      });
    }

    const lessons = await Lesson.find({
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

export const getAdminLessonDetails = async (
  req,
  res
) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const lesson = await Lesson.findById(
      req.params.id
    )
      .populate({
        path: "module",
        populate: {
          path: "course",
          select: "title slug status",
        },
      })
      .lean();

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    res.status(200).json(lesson);
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

export const updateLesson = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const allowedUpdates = {};

    if (typeof req.body.title === "string") {
      allowedUpdates.title =
        req.body.title.trim();
    }

    if (typeof req.body.type === "string") {
      allowedUpdates.type = req.body.type;
    }

    if (typeof req.body.content === "string") {
      allowedUpdates.content = req.body.content;
    }

    if (typeof req.body.videoUrl === "string") {
      allowedUpdates.videoUrl = req.body.videoUrl;
    }

    if (
      typeof req.body.documentUrl === "string"
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

    if (req.body.order !== undefined) {
      allowedUpdates.order =
        Number(req.body.order) || 1;
    }

    if (req.body.isPreview !== undefined) {
      allowedUpdates.isPreview =
        Boolean(req.body.isPreview);
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
        message: "Lesson not found.",
      });
    }

    res.status(200).json({
      message: "Lesson updated successfully.",
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

export const completeLesson = async (
  req,
  res
) => {
  try {
    const lessonId = req.params.lessonId;
    const studentId = req.user._id;

    const lesson = await Lesson.findById(
      lessonId
    ).populate({
      path: "module",
      populate: {
        path: "course",
        select: "title status",
      },
    });

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const course = lesson.module?.course;

    if (
      !course ||
      course.status !== "published"
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

    if (existingProgress?.completed === true) {
      return res.status(200).json({
        message: "Lesson already completed",
        progress: existingProgress,
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
      type: "lesson_completed",
      title: `Completed ${
        lesson.title || "Lesson"
      }`,
      points: 5,
    });

    return res.status(200).json({
      message: "Lesson completed",
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

export const getLessonProgress = async (
  req,
  res
) => {
  try {
    const progress =
      await LessonProgress.find({
        student: req.user._id,
        completed: true,
      }).populate("lesson");

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