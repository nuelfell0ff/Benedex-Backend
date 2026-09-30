import Module from "../models/Module.js";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";

import {
  recordLearningActivity,
} from "../utils/studentLearning.js";

import {
  generateAndSaveLessons,
} from "./lessonController.js";

import {
  generateAndSaveQuiz,
} from "./quizController.js";

const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({
      message: "Administrator access required.",
    });

    return false;
  }

  return true;
};

export const generateAndSaveModules = async (
  courseId,
  courseTitle,
  modulesData,
  apiKey,
  onProgress = () => {}
) => {
  let moduleOrder = 1;

  for (const modData of modulesData || []) {
    const currentModule = moduleOrder;

    onProgress(
      `-> Creating Module ${currentModule}: "${modData.title}"...`,
      "step"
    );

    const createdModule =
      await Module.create({
        title: modData.title,
        description:
          modData.description || "",
        course: courseId,
        month:
          modData.month ||
          currentModule,
        order: moduleOrder++,
      });

    onProgress(
      `   + Module created: ${createdModule._id}`,
      "success"
    );

    onProgress(
      `   -> Generating lessons for "${modData.title}"...`,
      "step"
    );

    await generateAndSaveLessons(
      createdModule._id,
      courseTitle,
      modData.title,
      modData.lessonTitles,
      apiKey,
      onProgress
    );

    onProgress(
      `   + Lessons generated for "${modData.title}"`,
      "success"
    );

    onProgress(
      `   -> Generating quiz for "${modData.title}"...`,
      "step"
    );

    const quiz =
      await generateAndSaveQuiz(
        createdModule._id,
        courseTitle,
        modData.title,
        apiKey,
        onProgress
      );

    if (quiz) {
      onProgress(
        `   + Quiz generated for "${modData.title}"`,
        "success"
      );
    } else {
      onProgress(
        `   ! Quiz could not be generated for "${modData.title}". Continuing to next module.`,
        "warning"
      );
    }

    onProgress(
      `   ✓ Module ${currentModule} completed: "${modData.title}"`,
      "success"
    );
  }
};

export const createModule = async (
  req,
  res
) => {
  try {
    const moduleData =
      await Module.create({
        title: req.body.title,
        description:
          req.body.description,
        course: req.body.course,
        month: req.body.month,
        order: req.body.order,
        content: req.body.content,
      });

    res.status(201).json(
      moduleData
    );
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllModules = async (
  req,
  res
) => {
  try {
    const modules =
      await Module.find()
        .populate(
          "course",
          "title status"
        )
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

export const getAdminModuleDetails =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const module =
        await Module.findById(
          req.params.id
        )
          .populate(
            "course",
            "title slug status"
          )
          .lean();

      if (!module) {
        return res.status(404).json({
          message: "Module not found.",
        });
      }

      const lessons =
        await Lesson.find({
          module: module._id,
        })
          .sort({
            order: 1,
          })
          .lean();

      res.status(200).json({
        module,
        lessons,
      });
    } catch (error) {
      console.error(
        "Admin module details error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateModule =
  async (req, res) => {
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
        req.body.month !== undefined
      ) {
        allowedUpdates.month =
          Number(req.body.month) || 1;
      }

      if (
        req.body.order !== undefined
      ) {
        allowedUpdates.order =
          Number(req.body.order) || 1;
      }

      const module =
        await Module.findByIdAndUpdate(
          req.params.id,
          {
            $set: allowedUpdates,
          },
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          "course",
          "title status"
        );

      if (!module) {
        return res.status(404).json({
          message: "Module not found.",
        });
      }

      res.status(200).json({
        message:
          "Module updated successfully.",
        module,
      });
    } catch (error) {
      console.error(
        "Update module error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getCourseModules = async (
  req,
  res
) => {
  try {
    const course =
      await Course.findOne({
        _id: req.params.courseId,
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

    const modules =
      await Module.find({
        course: course._id,
      }).sort({
        month: 1,
        order: 1,
      });

    if (modules.length > 0) {
      await recordLearningActivity({
        student: req.user._id,
        type: "lesson_started",
        title: `Started lesson in ${course.title}`,
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