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