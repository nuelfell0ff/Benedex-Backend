import Lesson from "../models/Lesson.js";
import LessonProgress from "../models/LessonProgress.js";
import Module from "../models/Module.js";
import { recordLearningActivity } from "../utils/studentLearning.js";


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

    const existing = await LessonProgress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (existing) {
      return res.status(400).json({
        message: "Lesson already completed"
      });
    }

    const progress = await LessonProgress.create({
      student: req.user._id,
      lesson: lessonId,
      completed: true
    });

    const lesson = await Lesson.findById(lessonId);

    await recordLearningActivity({
      student: req.user._id,
      type: "lesson_completed",
      title: `Completed ${lesson?.title || "Lesson"}`,
      points: 5
    });

    res.json({
      message: "Lesson completed",
      progress
    });
  } catch (error) {
  console.log(error.response?.data);
  console.log(error);
}
  }
};


// GET PROGRESS FOR MODULE
export const getLessonProgress = async (req, res) => {
  try {
    const progress = await LessonProgress.find({
      student: req.user._id
    });

    res.json(progress);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
