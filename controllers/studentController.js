import User from "../models/User.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import Submission from "../models/Submission.js";
import LearningActivity from "../models/LearningActivity.js";
import { buildLearningStats } from "../utils/studentLearning.js";

export const studentDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    const enrolledCourses = await Course.find({
      students: req.user._id,
    }).populate("instructor", "fullName");

    const progress = await Progress.find({
      student: req.user._id,
    }).populate("course", "title");

    const submissions = await Submission.find({
      student: req.user._id,
    }).populate({
      path: "assignment",
      select: "title",
    });

    const allActivities = await LearningActivity.find({
      student: req.user._id,
    }).sort({
      createdAt: -1,
    });

    const recentActivities = allActivities.slice(0, 10);

    const unreadActivityCount = await LearningActivity.countDocuments({
      student: req.user._id,
      $or: [{ isViewed: false }, { isViewed: { $exists: false } }],
    });

    const learningSummary = buildLearningStats(allActivities);

    const level = Math.max(1, Math.floor((user.xp || 0) / 100));
    const xpTarget = 80 + level * 160;
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
      submissions,
      learningSummary,
      recentActivities,
      unreadActivityCount,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const clearStudentActivityViews = async (req, res) => {
  try {
    await LearningActivity.updateMany(
      {
        student: req.user._id,
        $or: [{ isViewed: false }, { isViewed: { $exists: false } }],
      },
      {
        $set: { isViewed: true },
      }
    );

    res.json({
      message: "Activities marked as viewed",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const adminDashboard = async (req, res) => {
  res.json({
    message: "Welcome Admin",
  });
};