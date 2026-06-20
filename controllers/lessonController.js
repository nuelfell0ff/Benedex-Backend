import Lesson from "../models/Lesson.js";
import LessonProgress from "../models/LessonProgress.js";
import Module from "../models/Module.js";
import { recordLearningActivity } from "../utils/studentLearning.js";
import { checkAndGenerateCertificate } from "./certificateController.js";

// CREATE LESSON (Admin / Instructor)
export const createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create({
      title: req.body.title,
      type: req.body.type,
      content: req.body.content,
      videoUrl: req.body.videoUrl,
      documentUrl: req.body.documentUrl,
      module: req.body.module,
      order: req.body.order,
      isPreview: req.body.isPreview || false
    });

    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// GET LESSONS BY MODULE
export const getModuleLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({
      module: req.params.moduleId
    }).sort({ order: 1 });

    res.json(lessons);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// MARK LESSON AS COMPLETE
export const completeLesson = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const studentId = req.user._id;

    const existing = await LessonProgress.findOne({
      student: studentId,
      lesson: lessonId
    });

    if (existing) {
      return res.status(200).json({
        message: "Lesson already completed",
        progress: existing
      });
    }

    const progress = await LessonProgress.create({
      student: studentId,
      lesson: lessonId,
      completed: true
    });

    const lesson = await Lesson.findById(lessonId).populate("module");

    await recordLearningActivity({
      student: studentId,
      type: "lesson_completed",
      title: `Completed ${lesson?.title || "Lesson"}`,
      points: 5
    });

    res.json({
      message: "Lesson completed",
      progress
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
      student: req.user._id
    }).populate("lesson");

    console.log("Progress sent:", progress);
    res.json(progress);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};