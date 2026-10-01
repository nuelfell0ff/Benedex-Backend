import User from "../models/User.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import Submission from "../models/Submission.js";
import LearningActivity from "../models/LearningActivity.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import LessonProgress from "../models/LessonProgress.js";

import { buildLearningStats } from "../utils/studentLearning.js";


// ============================================================
// STUDENT DASHBOARD
// ============================================================

// @desc    Get student dashboard metrics & activity summary
// @route   GET /api/dashboard/student
// @access  Private (Student)

export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // ==========================================================
    // 1. GET STUDENT
    // ==========================================================

    const user = await User.findById(userId)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }


    // ==========================================================
    // 2. GET ALL DASHBOARD DATA IN PARALLEL
    // ==========================================================

    const [
      enrolledCourses,
      progress,
      submissions,
      activityHistory,
      lessonProgress,
    ] = await Promise.all([
      // --------------------------------------------------------
      // Enrolled courses
      // --------------------------------------------------------

      Course.find({
        students: userId,
      })
        .populate(
          "instructor",
          "fullName name email profileImage image role bio rating ratingCount"
        )
        .lean(),

      // --------------------------------------------------------
      // Existing Progress records
      // --------------------------------------------------------

      Progress.find({
        student: userId,
      })
        .populate("course", "title")
        .lean()
        .catch(() => []),

      // --------------------------------------------------------
      // Student submissions
      // --------------------------------------------------------

      Submission.find({
        student: userId,
      })
        .populate({
          path: "assignment",
          select: "title",
        })
        .lean()
        .catch(() => []),

      // --------------------------------------------------------
      // Learning activity
      // --------------------------------------------------------

      LearningActivity.find({
        student: userId,
      })
        .select("type title points createdAt")
        .sort({
          createdAt: -1,
        })
        .limit(50)
        .lean()
        .catch(() => []),

      // --------------------------------------------------------
      // Lesson progress
      // --------------------------------------------------------

      LessonProgress.find({
        student: userId,
        completed: true,
      })
        .select("student lesson completed createdAt")
        .lean()
        .catch(() => []),
    ]);


    // ==========================================================
    // 3. BUILD COMPLETED LESSON ID SET
    // ==========================================================

    /*
     * LessonProgress is the primary source because
     * completeLesson() writes to LessonProgress.
     */

    const completedLessonIds = new Set();

    lessonProgress.forEach((item) => {
      if (item.lesson) {
        completedLessonIds.add(
          String(item.lesson)
        );
      }
    });


    /*
     * The older Progress model may also contain lesson
     * completion records in this version of the backend.
     *
     * So we include those too when a lesson is marked
     * completed.
     */

    progress.forEach((item) => {
      if (
        item.lesson &&
        item.completed === true
      ) {
        completedLessonIds.add(
          String(item.lesson)
        );
      }
    });


    // ==========================================================
    // 4. BUILD COURSE PROGRESS
    // ==========================================================

    const coursesWithProgress =
      await Promise.all(
        enrolledCourses.map(
          async (course) => {
            const courseId = String(
              course._id
            );

            // --------------------------------------------------
            // Find modules for this course
            // --------------------------------------------------

            let modules = [];

            try {
              modules = await Module.find({
                $or: [
                  {
                    course: course._id,
                  },
                  {
                    courseId: course._id,
                  },
                ],
              })
                .select("_id course courseId")
                .lean();
            } catch (moduleError) {
              console.error(
                `Error finding modules for course ${courseId}:`,
                moduleError
              );

              modules = [];
            }


            // --------------------------------------------------
            // Get module IDs
            // --------------------------------------------------

            const moduleIds = modules
              .map(
                (module) =>
                  module._id
              )
              .filter(Boolean);


            // --------------------------------------------------
            // Find lessons
            // --------------------------------------------------

            let lessons = [];

            if (
              moduleIds.length > 0
            ) {
              try {
                lessons =
                  await Lesson.find({
                    $or: [
                      {
                        module: {
                          $in: moduleIds,
                        },
                      },
                      {
                        moduleId: {
                          $in: moduleIds,
                        },
                      },
                    ],
                  })
                    .select(
                      "_id module moduleId title"
                    )
                    .lean();
              } catch (lessonError) {
                console.error(
                  `Error finding lessons for course ${courseId}:`,
                  lessonError
                );

                lessons = [];
              }
            }


            // --------------------------------------------------
            // TOTAL LESSONS
            // --------------------------------------------------

            const totalLessonsCount =
              lessons.length;


            // --------------------------------------------------
            // COMPLETED LESSONS
            // --------------------------------------------------

            let completedLessonsCount = 0;

            lessons.forEach(
              (lesson) => {
                const lessonId =
                  String(
                    lesson._id
                  );

                if (
                  completedLessonIds.has(
                    lessonId
                  )
                ) {
                  completedLessonsCount += 1;
                }
              }
            );


            // --------------------------------------------------
            // CALCULATE PERCENTAGE
            // --------------------------------------------------

            let calculatedProgress = 0;

            if (
              totalLessonsCount > 0
            ) {
              calculatedProgress =
                Math.round(
                  (completedLessonsCount /
                    totalLessonsCount) *
                    100
                );
            }


            calculatedProgress =
              Math.max(
                0,
                Math.min(
                  100,
                  calculatedProgress
                )
              );


            // --------------------------------------------------
            // RETURN COURSE
            // --------------------------------------------------

            return {
              ...course,

              totalLessonsCount,

              completedLessonsCount,

              progress:
                calculatedProgress,

              lessonsProgress: {
                completed:
                  completedLessonsCount,

                total:
                  totalLessonsCount,

                percentage:
                  calculatedProgress,
              },
            };
          }
        )
      );


    // ==========================================================
    // 5. RECENT ACTIVITIES
    // ==========================================================

    const recentActivities =
      activityHistory
        .slice(0, 20)
        .map((item) => ({
          _id: item._id,

          type: item.type,

          title: item.title,

          points:
            item.points || 0,

          createdAt:
            item.createdAt,
        }));


    // ==========================================================
    // 6. FALLBACK ACTIVITY HISTORY
    // ==========================================================

    const fallbackActivityHistory = [
      ...progress.map(
        (item) => ({
          createdAt:
            item.createdAt,

          points: 0,
        })
      ),

      ...submissions.map(
        (item) => ({
          createdAt:
            item.createdAt,

          points:
            item.grade || 0,
        })
      ),
    ];


    // ==========================================================
    // 7. LEARNING SUMMARY
    // ==========================================================

    const learningSummary =
      buildLearningStats([
        ...activityHistory,
        ...fallbackActivityHistory,
      ]);


    // ==========================================================
    // 8. XP / LEVEL
    // ==========================================================

    const userXp =
      user.xp || 0;

    const level = Math.max(
      1,
      Math.floor(
        userXp / 100
      )
    );

    const xpTarget =
      80 + level * 160;

    const xpProgress =
      Math.min(
        100,
        Math.round(
          (userXp /
            xpTarget) *
            100
        )
      );


    // ==========================================================
    // 9. RETURN DASHBOARD
    // ==========================================================

    return res.status(200).json({
      profile: user,

      xp: userXp,

      level,

      xpTarget,

      xpProgress,

      badges:
        user.badges || [],

      /*
       * IMPORTANT:
       *
       * Every enrolled course now contains:
       *
       * totalLessonsCount
       * completedLessonsCount
       * progress
       * lessonsProgress
       */

      enrolledCourses:
        coursesWithProgress,

      progress,

      submissions,

      learningSummary,

      recentActivities,
    });
  } catch (error) {
    console.error(
      "Dashboard Error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Internal Server Error",
    });
  }
};



// ============================================================
// INSTRUCTOR DASHBOARD OVERVIEW
// ============================================================

// @desc    Get instructor dashboard metric cards overview
// @route   GET /api/dashboard/analytics/overview
// @access  Private (Instructor only)

export const getInstructorOverview =
  async (req, res) => {
    try {
      return res.status(200).json({
        totalStudents: 1240,
        completionRate: 78,
        pendingGrading: 14,
        activeCourses: 3,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  };



// ============================================================
// INSTRUCTOR COURSES
// ============================================================

// @desc    Get instructor courses and active grading work items
// @route   GET /api/dashboard/courses
// @access  Private (Instructor only)

export const getInstructorCourses =
  async (req, res) => {
    try {
      return res.status(200).json([
        {
          id: "cpe-308",

          title:
            "CPE308: Assembly Language Programming & Computer Architecture",

          studentsCount: 420,

          modulesCount: 8,

          completionRate: 82,

          pendingTasks: [
            {
              submissionId:
                "sub-101",

              taskName:
                "Assembly Lab 3: Cache Mapping",

              courseCode:
                "CPE308",

              submittedAt:
                "8h ago",
            },
          ],
        },

        {
          id: "fe-react",

          title:
            "Advanced Frontend Engineering with React & Framer Motion",

          studentsCount: 680,

          modulesCount: 12,

          completionRate: 74,

          pendingTasks: [
            {
              submissionId:
                "sub-102",

              taskName:
                "Framer Motion Micro-Interactions",

              courseCode:
                "FE-React",

              submittedAt:
                "14h ago",
            },
          ],
        },
      ]);
    } catch (error) {
      return res.status(500).json({
        message:
          "Server Error",
        error:
          error.message,
      });
    }
  };



// ============================================================
// INSTRUCTOR WEEKLY ENGAGEMENT
// ============================================================

// @desc    Get weekly telemetry engagement data
// @route   GET /api/dashboard/analytics/weekly-engagement
// @access  Private (Instructor only)

export const getInstructorEngagement =
  async (req, res) => {
    try {
      return res.status(200).json([
        45,
        62,
        58,
        84,
        76,
        92,
        88,
      ]);
    } catch (error) {
      return res.status(500).json({
        message:
          "Server Error",
        error:
          error.message,
      });
    }
  };



// ============================================================
// INSTRUCTOR STUDENTS AT RISK
// ============================================================

// @desc    Get drop-off metrics warnings for students at risk
// @route   GET /api/dashboard/analytics/students-at-risk
// @access  Private (Instructor only)

export const getInstructorAtRisk =
  async (req, res) => {
    try {
      return res.status(200).json([
        {
          studentName:
            "Emmanuel N.",

          lastActiveWindow:
            "3 days ago",

          performanceDropPercentage:
            24,
        },

        {
          studentName:
            "Marcus V.",

          lastActiveWindow:
            "5 days ago",

          performanceDropPercentage:
            18,
        },
      ]);
    } catch (error) {
      return res.status(500).json({
        message:
          "Server Error",
        error:
          error.message,
      });
    }
  };