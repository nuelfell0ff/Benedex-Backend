import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Quiz from "../models/Quiz.js";
import CourseGenerationJob from "../models/CourseGenerationJob.js";

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

const updateGenerationJob = async (
  jobId,
  updates
) => {
  try {
    await CourseGenerationJob.findByIdAndUpdate(
      jobId,
      {
        $set: updates,
      },
      {
        new: true,
      }
    );
  } catch (error) {
    console.error(
      "Failed to update generation job:",
      error.message
    );
  }
};

const getProgressFromMessage = (
  message,
  totalModules,
  completedModules
) => {
  if (
    message.includes(
      "Generating course outline"
    )
  ) {
    return 5;
  }

  if (
    message.includes(
      "Course outline generated"
    )
  ) {
    return 10;
  }

  if (
    message.includes(
      "Preparing course cover image"
    )
  ) {
    return 15;
  }

  if (
    message.includes(
      "Draft course created"
    )
  ) {
    return 20;
  }

  if (
    message.includes("Module") &&
    message.includes("completed:")
  ) {
    if (totalModules <= 0) {
      return 90;
    }

    const moduleProgress =
      (completedModules / totalModules) * 75;

    return Math.min(
      95,
      Math.round(20 + moduleProgress)
    );
  }

  if (
    message.includes(
      "Generating lessons"
    )
  ) {
    if (totalModules <= 0) {
      return 25;
    }

    const moduleProgress =
      (completedModules / totalModules) * 75;

    return Math.min(
      95,
      Math.round(20 + moduleProgress)
    );
  }

  if (
    message.includes(
      "Generating quiz"
    )
  ) {
    if (totalModules <= 0) {
      return 25;
    }

    const moduleProgress =
      (completedModules / totalModules) * 75;

    return Math.min(
      95,
      Math.round(20 + moduleProgress)
    );
  }

  return null;
};

const runCourseGeneration = async ({
  jobId,
  req,
  user,
  syllabusText,
  price,
  duration,
  tools,
}) => {
  let course = null;

  try {
    const apiKey =
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is missing in backend environment variables."
      );
    }

    await updateGenerationJob(jobId, {
      status: "generating",
      progress: 5,
      currentStep:
        "Generating course outline...",
      error: null,
    });

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

    await updateGenerationJob(jobId, {
      progress: 10,
      currentStep: `Course outline generated: "${courseOutline.title}"`,
    });

    await updateGenerationJob(jobId, {
      progress: 15,
      currentStep:
        "Preparing course cover image...",
    });

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

    course = await Course.create({
      title: courseOutline.title,
      slug: uniqueSlug,
      description:
        courseOutline.description,
      instructor: user._id,
      duration:
        duration || "3 Months",
      price: Number(price) || 0,
      tools:
        Array.isArray(tools) &&
        tools.length > 0
          ? tools
          : courseOutline.suggestedTools ||
            [],
      image: courseCover?.url || "",
      createdByAI: true,
      status: "draft",
    });

    await updateGenerationJob(jobId, {
      course: course._id,
      progress: 20,
      currentStep:
        "Draft course created. Preparing modules...",
    });

    const totalModules =
      Array.isArray(
        courseOutline.modules
      )
        ? courseOutline.modules.length
        : 0;

    let completedModules = 0;

    const sendProgress = async (
      message,
      type = "info",
      data = {}
    ) => {
      if (
        message.includes(
          "completed:"
        )
      ) {
        completedModules++;
      }

      const calculatedProgress =
        getProgressFromMessage(
          message,
          totalModules,
          completedModules
        );

      const updates = {
        currentStep: message,
      };

      if (
        calculatedProgress !== null
      ) {
        updates.progress =
          calculatedProgress;
      }

      if (data?.courseId) {
        updates.course =
          data.courseId;
      }

      await updateGenerationJob(
        jobId,
        updates
      );
    };

    await generateAndSaveModules(
      course._id,
      courseOutline.title,
      courseOutline.modules,
      apiKey,
      sendProgress
    );

    await updateGenerationJob(jobId, {
      status: "generating",
      progress: 95,
      currentStep:
        "Finalizing generated course...",
    });

    if (
      user &&
      user.role === "admin"
    ) {
      await logAdminActivity(
        req,
        "COURSES",
        "CREATE",
        `AI generated complete draft course structure for: "${course.title}"`
      );
    }

    await updateGenerationJob(jobId, {
      status: "completed",
      progress: 100,
      currentStep:
        `Course generation completed. Draft "${course.title}" is ready for admin review.`,
      course: course._id,
      completedAt: new Date(),
      error: null,
    });

    console.log(
      `AI course generation completed successfully. Job: ${jobId}, Course: ${course._id}`
    );
  } catch (error) {
    console.error(
      "Background AI Course Generation Error:",
      error.response?.data ||
        error.message
    );

    await updateGenerationJob(jobId, {
      status: "failed",
      currentStep:
        "Course generation failed.",
      error: error.message,
      course:
        course?._id || null,
      completedAt: new Date(),
    });
  }
};

export const generateCourseFromSyllabus =
  async (req, res) => {
    try {
      const {
        syllabusText,
        price,
        duration,
        tools,
      } = req.body;

      if (
        !syllabusText ||
        !syllabusText.trim()
      ) {
        return res.status(400).json({
          message:
            "Syllabus text is required.",
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

      const activeJob =
        await CourseGenerationJob.findOne(
          {
            createdBy: req.user._id,
            status: {
              $in: [
                "pending",
                "generating",
              ],
            },
          }
        ).sort({
          createdAt: -1,
        });

      if (activeJob) {
        return res.status(409).json({
          message:
            "You already have a course generation in progress.",
          jobId: activeJob._id,
          status: activeJob.status,
        });
      }

      const job =
        await CourseGenerationJob.create({
          createdBy: req.user._id,
          status: "pending",
          progress: 0,
          currentStep:
            "Preparing course generation...",
        });

      res.status(202).json({
        message:
          "Course generation started in the background.",
        jobId: job._id,
        status: job.status,
      });

      setImmediate(() => {
        runCourseGeneration({
          jobId: job._id,
          req,
          user: req.user,
          syllabusText:
            syllabusText.trim(),
          price,
          duration,
          tools,
        }).catch(async (error) => {
          console.error(
            "Unexpected background generation error:",
            error
          );

          await updateGenerationJob(
            job._id,
            {
              status: "failed",
              currentStep:
                "Course generation failed.",
              error:
                error.message ||
                "An unexpected error occurred.",
              completedAt: new Date(),
            }
          );
        });
      });
    } catch (error) {
      console.error(
        "Start AI Course Generation Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to start course generation.",
        error: error.message,
      });
    }
  };

export const getCourseGenerationStatus =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const job =
        await CourseGenerationJob.findOne({
          _id: req.params.jobId,
          createdBy: req.user._id,
        })
          .populate(
            "course",
            "title slug status image"
          )
          .lean();

      if (!job) {
        return res.status(404).json({
          message:
            "Course generation job not found.",
        });
      }

      res.status(200).json({
        job,
      });
    } catch (error) {
      console.error(
        "Get generation status error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getActiveCourseGeneration =
  async (req, res) => {
    try {
      if (!ensureAdmin(req, res)) {
        return;
      }

      const job =
        await CourseGenerationJob.findOne(
          {
            createdBy: req.user._id,
            status: {
              $in: [
                "pending",
                "generating",
              ],
            },
          }
        )
          .populate(
            "course",
            "title slug status image"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      res.status(200).json({
        job: job || null,
      });
    } catch (error) {
      console.error(
        "Get active generation error:",
        error
      );

      res.status(500).json({
        message: error.message,
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
          "fullName email profileImage role bio rating ratingCount"
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

export const getPublishedCourses =
  async (req, res) => {
    try {
      const courses =
        await Course.find({
          status: "published",
        })
          .populate(
            "instructor",
            "fullName email profileImage role bio rating ratingCount"
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
      }).populate(
        "instructor",
        "fullName name email profileImage image role bio rating ratingCount"
      );

    if (!course) {
      return res.status(404).json({
        message:
          "Course not found or is not currently published.",
      });
    }

    res.json(course);
  } catch (error) {
    console.error(
      "Get single course error:",
      error
    );

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
          "fullName name email profileImage image role bio rating ratingCount"
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

      const quizzes =
        moduleIds.length > 0
          ? await Quiz.find({
              module: {
                $in: moduleIds,
              },
            })
              .sort({
                createdAt: 1,
              })
              .lean()
          : [];

      const modulesWithContent =
        modules.map((module) => ({
          ...module,

          lessons:
            lessons.filter(
              (lesson) =>
                lesson.module
                  .toString() ===
                module._id.toString()
            ),

          quiz:
            quizzes.find(
              (quiz) =>
                quiz.module
                  .toString() ===
                module._id.toString()
            ) || null,
        }));

      res.status(200).json({
        course,
        modules: modulesWithContent,
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

      if (
        course.status ===
        "published"
      ) {
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

    if (
      course.status !==
      "published"
    ) {
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
      message:
        "Enrollment successful",
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
            "fullName name profileImage image role bio rating ratingCount"
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
          .populate({
            path: "instructor",
            select:
              "fullName name profileImage image role bio rating ratingCount",
          })
          .select(
            "title description price duration image status createdByAI students instructor"
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