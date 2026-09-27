import Module from "../models/Module.js";
import Progress from "../models/Progress.js";
import Course from "../models/Course.js";
import { recordLearningActivity } from "../utils/studentLearning.js";
import { generateAndSaveLessons } from "./lessonController.js";

// ==========================================
// AI MODULE PIPELINE GENERATOR HELPER
// ==========================================
export const generateAndSaveModules = async (
  courseId,
  courseTitle,
  modulesData,
  apiKey
) => {
  let moduleOrder = 1;

  for (const modData of modulesData || []) {
    console.log(
      `-> Creating Module ${moduleOrder}: "${modData.title}"...`
    );

    const createdModule = await Module.create({
      title: modData.title,
      description: modData.description || "",
      course: courseId,
      month: modData.month || moduleOrder,
      order: moduleOrder++,
    });

    // Delegate detailed lesson generation and markdown writing
    // to lessonController
    await generateAndSaveLessons(
      createdModule._id,
      courseTitle,
      modData.title,
      modData.lessonTitles,
      apiKey
    );
  }
};

// ==========================================
// CREATE MODULE (STANDARD MANUAL)
// ==========================================
export const createModule = async (req, res) => {
  try {
    const moduleData = await Module.create({
      title: req.body.title,
      description: req.body.description,
      course: req.body.course,
      month: req.body.month,
      order: req.body.order,
      content: req.body.content,
    });

    res.status(201).json(moduleData);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL MODULES
// ==========================================
export const getAllModules = async (req, res) => {
  try {
    const modules = await Module.find()
      .populate("course", "title")
      .sort({
        month: 1,
        order: 1,
      });

    res.json(modules);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ==========================================
// GET MODULES FOR A SPECIFIC COURSE
// ==========================================
// IMPORTANT:
// This endpoint returns ALL modules belonging to the course.
//
// Module locking is handled by the frontend using quiz progress.
// We do NOT filter modules here based on assignments/months.
export const getCourseModules = async (req, res) => {
  try {
    const modules = await Module.find({
      course: req.params.courseId,
    }).sort({
      month: 1,
      order: 1,
    });

    // Record learning activity when the student opens a course
    if (modules.length > 0) {
      const course = await Course.findById(
        req.params.courseId
      ).select("title");

      await recordLearningActivity({
        student: req.user._id,
        type: "lesson_started",
        title: `Started lesson in ${
          course?.title || "a course"
        }`,
        points: 0,
      });
    }

    res.json(modules);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};