import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";

import {
  applyXpToUser,
  recordLearningActivity,
} from "../utils/studentLearning.js";

import sendPushNotification from "../utils/sendPushNotification.js";
import { logAdminActivity } from "../middleware/auditLogger.js";

import { generateAndSaveModules } from "./moduleController.js";

import {
  fetchUnsplashImage,
  callOpenRouterAI,
  slugify,
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

const sendGenerationProgress = (
  res,
  message,
  type = "info",
  data = {}
) => {
  if (!res.headersSent) {
    return;
  }

  try {
    res.write(
      `data: ${JSON.stringify({
        type,
        message,
        ...data,
      })}\n\n`
    );
  } catch (error) {
    console.error(
      "Failed to send generation progress:",
      error.message
    );
  }
};

export const generateCourseFromSyllabus = async (
  req,
  res
) => {
  try {
    const {
      syllabusText,
      price,
      duration,
      tools,
    } = req.body;

    if (!syllabusText) {
      return res.status(400).json({
        message: "Syllabus text is required.",
      });
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message:
          "OPENROUTER_API_KEY is missing in backend environment variables.",
      });
    }

    res.status(200);

    res.setHeader(
      "Content-Type",
      "text/event-stream"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.setHeader(
      "X-Accel-Buffering",
      "no"
    );

    if (
      typeof res.flushHeaders ===
      "function"
    ) {
      res.flushHeaders();
    }

    const sendProgress = (
      message,
      type = "info",
      data = {}
    ) => {
      sendGenerationProgress(
        res,
        message,
        type,
        data
      );
    };

    sendProgress(
      "Step 1: Generating course outline...",
      "step"
    );

    const outlinePrompt = `
You are an elite academic curriculum designer. Analyze the syllabus text below and output the overarching course metadata and an outline of all modules and their respective lesson titles.

Return ONLY a valid raw JSON object starting with '{' and ending with '}'.

Do not wrap the response in markdown code blocks.

REQUIRED JSON SCHEMA:

{
  "title": "Comprehensive Course Title",
  "description": "Extensive course summary",
  "suggestedTools": ["Tool 1", "Tool 2"],
  "modules": [
    {
      "title": "Module Title",
      "description": "Module overview",
      "month": 1,
      "lessonTitles": [
        "Lesson Title 1",
        "Lesson Title 2",
        "Lesson Title 3",
        "Lesson Title 4"
      ]
    }
  ]
}

SYLLABUS:

${syllabusText}
`;

    const courseOutline =
      await callOpenRouterAI(
        outlinePrompt,
        apiKey
      );

    sendProgress(
      `Course outline generated: "${courseOutline.title}"`,
      "success"
    );

    sendProgress(
      "Step 2: Preparing course cover image...",
      "step"
    );

    const courseCover =
      await fetchUnsplashImage(
        courseOutline.title
      );

    let baseSlug = slugify(
      courseOutline.title
    );

    let uniqueSlug = baseSlug;
    let count = 1;

    while (
      await Course.findOne({
        slug: uniqueSlug,
      })
    ) {
      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }

    const course = await Course.create({
      title: courseOutline.title,
      slug: uniqueSlug,
      description:
        courseOutline.description,
      instructor: req.user._id,
      duration:
        duration || "3 Months",
      price: price || 0,
      tools:
        tools ||
        courseOutline.suggestedTools ||
        [],
      image: courseCover.url,
      createdByAI: true,
      status: "draft",
    });

    sendProgress(
      `Step 2: Draft course created (${course._id}). Handing off to module controller...`,
      "success",
      {
        courseId: course._id,
        status: course.status,
      }
    );

    await generateAndSaveModules(
      course._id,
      courseOutline.title,
      courseOutline.modules,
      apiKey,
      sendProgress
    );

    if (
      req.user &&
      req.user.role === "admin"
    ) {
      await logAdminActivity(
        req,
        "COURSES",
        "CREATE",
        `AI generated complete draft course structure for: "${course.title}"`
      );
    }

    sendProgress(
      `Course generation completed successfully. Draft "${course.title}" is ready for admin review.`,
      "complete",
      {
        course,
        status: "draft",
      }
    );

    res.end();
  } catch (error) {
    console.error(
      "AI Course Generation Error:",
      error.response?.data ||
        error.message
    );

    if (res.headersSent) {
      sendGenerationProgress(
        res,
        `Course generation failed: ${error.message}`,
        "error"
      );

      res.end();
      return;
    }

    return res.status(500).json({
      message:
        "Failed to generate course",
      error: error.message,
    });
  }
};

export const createCourse = async (
  req,
  res
) => {
  try {
    const course = await Course.create({
      title: req.body.title,
      slug: req.body.slug,
      description: req.body.description,
      price: req.body.price,
      tools: req.body.tools,
      instructor: req.user._id,
    });

    if (
      req.user &&
      req.user.role === "admin"
    ) {
      await logAdminActivity(
        req,
        "COURSES",
        "CREATE",
        `Created a brand new course entitled: "${course.title}"`
      );
    }

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getCourses = async (
  req,
  res
) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const courses =
      await Course.find()
        .populate(
          "instructor",
          "fullName email"
        )
        .sort({
          createdAt: -1,
        });

    await logAdminActivity(
      req,
      "COURSES",
      "VIEW",
      "Accessed and viewed the complete course management registry."
    );

    res.json(courses);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getPublishedCourses = async (
  req,
  res
) => {
  try {
    const courses =
      await Course.find({
        status: "published",
      })
        .populate(
          "instructor",
          "fullName email profileImage"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getSingleCourse = async (
  req,
  res
) => {
  try {
    const course =
      await Course.findOne({
        _id: req.params.id,
        status: "published",
      });

    if (!course) {
      return res.status(404).json({
        message:
          "Course not found or is not currently published.",
      });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAdminCourseStructure =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const course =
        await Course.findById(
          req.params.id
        ).populate(
          "instructor",
          "fullName email profileImage"
        );

      if (!course) {
        return res.status(404).json({
          message: "Course not found.",
        });
      }

      const modules =
        await Module.find({
          course: course._id,
        })
          .sort({
            month: 1,
            order: 1,
          })
          .lean();

      const moduleIds =
        modules.map(
          (module) => module._id
        );

      const lessons =
        moduleIds.length > 0
          ? await Lesson.find({
              module: {
                $in: moduleIds,
              },
            })
              .sort({
                order: 1,
              })
              .lean()
          : [];

      const modulesWithLessons =
        modules.map((module) => ({
          ...module,
          lessons:
            lessons.filter(
              (lesson) =>
                lesson.module.toString() ===
                module._id.toString()
            ),
        }));

      res.status(200).json({
        course,
        modules: modulesWithLessons,
      });
    } catch (error) {
      console.error(
        "Admin course structure error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateCourse =
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
        req.body.price !== undefined
      ) {
        allowedUpdates.price =
          Number(req.body.price) || 0;
      }

      if (
        typeof req.body.duration ===
        "string"
      ) {
        allowedUpdates.duration =
          req.body.duration;
      }

      if (Array.isArray(req.body.tools)) {
        allowedUpdates.tools =
          req.body.tools
            .map((tool) =>
              String(tool).trim()
            )
            .filter(Boolean);
      }

      if (
        typeof req.body.image ===
        "string"
      ) {
        allowedUpdates.image =
          req.body.image;
      }

      const course =
        await Course.findByIdAndUpdate(
          req.params.id,
          {
            $set: allowedUpdates,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!course) {
        return res.status(404).json({
          message: "Course not found.",
        });
      }

      await logAdminActivity(
        req,
        "COURSES",
        "UPDATE",
        `Updated course: "${course.title}"`
      );

      res.status(200).json({
        message:
          "Course updated successfully.",
        course,
      });
    } catch (error) {
      console.error(
        "Update course error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const publishCourse =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const course =
        await Course.findById(
          req.params.id
        );

      if (!course) {
        return res.status(404).json({
          message: "Course not found.",
        });
      }

      if (course.status === "published") {
        return res.status(400).json({
          message:
            "This course is already published.",
        });
      }

      const moduleCount =
        await Module.countDocuments({
          course: course._id,
        });

      if (moduleCount === 0) {
        return res.status(400).json({
          message:
            "Course cannot be published because it has no modules.",
        });
      }

      const modules =
        await Module.find({
          course: course._id,
        }).select("_id");

      const moduleIds =
        modules.map(
          (module) => module._id
        );

      const lessonCount =
        await Lesson.countDocuments({
          module: {
            $in: moduleIds,
          },
        });

      if (lessonCount === 0) {
        return res.status(400).json({
          message:
            "Course cannot be published because it has no lessons.",
        });
      }

      course.status = "published";

      await course.save();

      await logAdminActivity(
        req,
        "COURSES",
        "PUBLISH",
        `Published course: "${course.title}"`
      );

      res.status(200).json({
        message:
          "Course published successfully.",
        course,
      });
    } catch (error) {
      console.error(
        "Publish course error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const enrollCourse = async (
  req,
  res
) => {
  try {
    const course =
      await Course.findById(
        req.params.courseId
      );

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (course.status !== "published") {
      return res.status(403).json({
        message:
          "This course is not available for enrollment yet.",
      });
    }

    const alreadyEnrolled =
      course.students.includes(
        req.user._id
      );

    if (alreadyEnrolled) {
      return res.status(400).json({
        message: "Already enrolled",
      });
    }

    course.students.push(
      req.user._id
    );

    await course.save();

    await Progress.create({
      student: req.user._id,
      course: course._id,
      completedModules: [],
    });

    await applyXpToUser(
      req.user,
      10
    );

    await recordLearningActivity({
      student: req.user._id,
      type: "course_enrolled",
      title: `Enrolled in ${course.title}`,
      points: 10,
    });

    res.json({
      message: "Enrollment successful",
      course,
    });

    try {
      await sendPushNotification(
        req.user._id,
        {
          title:
            "🚀 Enrollment Confirmed!",
          body: `Welcome to "${course.title}". Your learning path is unlocked!`,
          url: `/student/course/${course._id}`,
        }
      );
    } catch (pushError) {
      console.error(
        "Background task course enrollment push failure:",
        pushError
      );
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getStudentCourses =
  async (req, res) => {
    try {
      const enrolledCourses =
        await Course.find({
          students: req.user._id,
          status: "published",
        })
          .populate(
            "instructor",
            "fullName profileImage role"
          )
          .select(
            "title instructor status"
          );

      res.status(200).json(
        enrolledCourses
      );
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getInstructorCourses =
  async (req, res) => {
    try {
      const courses =
        await Course.find({
          instructor: req.user._id,
        })
          .populate({
            path: "students",
            select:
              "fullName profileImage role email",
          })
          .select(
            "title description price duration image status createdByAI students"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json(courses);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };