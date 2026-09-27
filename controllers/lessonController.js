import Lesson from "../models/Lesson.js";
import LessonProgress from "../models/LessonProgress.js";
import Module from "../models/Module.js";
import { recordLearningActivity } from "../utils/studentLearning.js";
import { checkAndGenerateCertificate } from "./certificateController.js";
import { callOpenRouterAI, fetchUnsplashImage } from "../utils/aiHelpers.js";

// ==========================================
// AI LESSON PIPELINE GENERATOR HELPER
// ==========================================
export const generateAndSaveLessons = async (moduleId, courseTitle, moduleTitle, lessonTitles, apiKey) => {
  console.log(`   -> Generating detailed lessons for module: "${moduleTitle}"...`);

  const modulePrompt = `
    You are an expert textbook author. Write comprehensive, textbook-grade markdown content for EVERY lesson in the following module.
    
    Course: "${courseTitle}"
    Module: "${moduleTitle}"
    Lessons to write: ${JSON.stringify(lessonTitles)}

    DIRECTIVES:
    - Write exhaustive, publication-grade markdown content (at least 500-700 words per lesson) with clear sections, headings (##, ###), bullet points, definitions, and rigorous technical breakdowns.
    - Ensure all newlines are properly escaped as \\n in JSON format.
    - Provide a distinct photographic search keyword ("imageSearchTerm") for each lesson's top cover image.
    - Return ONLY a valid raw JSON object starting with '{' and ending with '}'. Do not wrap in markdown code blocks.

    REQUIRED JSON SCHEMA:
    {
      "lessons": [
        {
          "title": "Exact Lesson Title",
          "markdownContent": "# Lesson Title\\n\\nComprehensive multi-paragraph technical introduction...\\n\\n## Core Principles\\n- Detailed point 1\\n- Detailed point 2\\n\\n## Advanced Breakdown\\nDeep technical analysis...",
          "imageSearchTerm": "specific photographic keyword"
        }
      ]
    }
  `;

  try {
    const moduleDetails = await callOpenRouterAI(modulePrompt, apiKey);

    let lessonOrder = 1;
    for (const lesData of (moduleDetails.lessons || [])) {
      const searchKeyword = lesData.imageSearchTerm || lesData.title;
      const heroImageData = await fetchUnsplashImage(searchKeyword);

      console.log(`      + Saving lesson: "${lesData.title}" with Unsplash cover image.`);

      await Lesson.create({
        title: lesData.title,
        type: "text",
        content: lesData.markdownContent || "",
        illustrationUrl: heroImageData.url,
        photographerName: heroImageData.photographerName,
        photographerUrl: heroImageData.photographerUrl,
        module: moduleId,
        order: lessonOrder++,
        isPreview: lessonOrder === 2,
      });
    }
  } catch (err) {
    console.error(`Failed to generate lessons for module "${moduleTitle}":`, err.message);
    throw err;
  }
};

// CREATE LESSON (Admin / Instructor - Standard Manual)
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
    res.status(500).json({ message: error.message });
  }
};

// GET LESSONS BY MODULE
export const getModuleLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({
      module: req.params.moduleId,
    }).sort({ order: 1 });

    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// MARK LESSON AS COMPLETE
export const completeLesson = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const studentId = req.user._id;

    const existing = await LessonProgress.findOne({
      student: studentId,
      lesson: lessonId,
    });

    if (existing) {
      return res.status(200).json({
        message: "Lesson already completed",
        progress: existing,
      });
    }

    const progress = await LessonProgress.create({
      student: studentId,
      lesson: lessonId,
      completed: true,
    });

    const lesson = await Lesson.findById(lessonId).populate("module");

    await recordLearningActivity({
      student: studentId,
      type: "lesson_completed",
      title: `Completed ${lesson?.title || "Lesson"}`,
      points: 5,
    });

    res.json({
      message: "Lesson completed",
      progress,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// GET PROGRESS FOR MODULE
export const getLessonProgress = async (req, res) => {
  try {
    const progress = await LessonProgress.find({
      student: req.user._id,
    }).populate("lesson");

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};