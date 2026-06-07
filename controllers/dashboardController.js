import User from "../models/User.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import Submission from "../models/Submission.js";
import LearningActivity from "../models/LearningActivity.js";
import { buildLearningStats } from "../utils/studentLearning.js";

export const getStudentDashboard =
  async (req, res) => {

    try {

      const user = await User.findById(
        req.user._id
      )
        .select("-password");



      const enrolledCourses =
        await Course.find({

          students: req.user._id

        })

          .populate(
            "instructor",
            "fullName"
          );



      const progress =
        await Progress.find({

          student: req.user._id

        })

          .populate(
            "course",
            "title"
          );




      const submissions =
        await Submission.find({

          student: req.user._id

        })

          .populate({

            path: "assignment",
            select: "title"
          });



      const activityHistory = await LearningActivity.find({
        student: req.user._id
      })
        .select("type title points createdAt")
        .sort({
          createdAt: -1
        });

      const recentActivities = activityHistory.slice(0, 20).map((item) => ({
        _id: item._id,
        type: item.type,
        title: item.title,
        points: item.points || 0,
        createdAt: item.createdAt
      }));

      const fallbackActivityHistory = [
        ...progress.map((item) => ({
          createdAt: item.createdAt,
          points: 0
        })),
        ...submissions.map((item) => ({
          createdAt: item.createdAt,
          points: item.grade || 0
        }))
      ];

      const learningSummary = buildLearningStats(
        [...activityHistory, ...fallbackActivityHistory]
      );

      const level = Math.max(1, Math.floor((user.xp || 0) / 100));
      const xpTarget = 80 + (level * 160);
      const xpProgress = Math.min(100, Math.round(((user.xp || 0) / xpTarget) * 100));



      res.json({

        profile: user,

        xp: user.xp,

        level,

        xpTarget,

        xpProgress,

        badges: user.badges,

        enrolledCourses,

        progress,

        submissions

        , learningSummary,
        recentActivities

      });

    }

    catch (error) {

      res.status(500).json({

        message: error.message

      });

    }

  };

// @desc    Get instructor dashboard metric cards overview
// @route   GET /api/dashboard/analytics/overview
// @access  Private (Instructor only)
export const getInstructorOverview = async (req, res) => {
  try {
    // In production: calculate via DB aggregations using req.user._id
    res.status(200).json({
      totalStudents: 1240,
      completionRate: 78,
      pendingGrading: 14,
      activeCourses: 3
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get instructor courses and active grading work items
// @route   GET /api/dashboard/courses
// @access  Private (Instructor only)
export const getInstructorCourses = async (req, res) => {
  try {
    res.status(200).json([
      {
        id: "cpe-308",
        title: "CPE308: Assembly Language Programming & Computer Architecture",
        studentsCount: 420,
        modulesCount: 8,
        completionRate: 82,
        pendingTasks: [
          {
            submissionId: "sub-101",
            taskName: "Assembly Lab 3: Cache Mapping",
            courseCode: "CPE308",
            submittedAt: "8h ago"
          }
        ]
      },
      {
        id: "fe-react",
        title: "Advanced Frontend Engineering with React & Framer Motion",
        studentsCount: 680,
        modulesCount: 12,
        completionRate: 74,
        pendingTasks: [
          {
            submissionId: "sub-102",
            taskName: "Framer Motion Micro-Interactions",
            courseCode: "FE-React",
            submittedAt: "14h ago"
          }
        ]
      }
    ]);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get weekly telemetry engagement data numbers array
// @route   GET /api/dashboard/analytics/weekly-engagement
// @access  Private (Instructor only)
export const getInstructorEngagement = async (req, res) => {
  try {
    res.status(200).json([45, 62, 58, 84, 76, 92, 88]);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get drop-off metrics warnings for students at risk
// @route   GET /api/dashboard/analytics/students-at-risk
// @access  Private (Instructor only)
export const getInstructorAtRisk = async (req, res) => {
  try {
    res.status(200).json([
      {
        studentName: "Emmanuel N.",
        lastActiveWindow: "3 days ago",
        performanceDropPercentage: 24
      },
      {
        studentName: "Marcus V.",
        lastActiveWindow: "5 days ago",
        performanceDropPercentage: 18
      }
    ]);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
