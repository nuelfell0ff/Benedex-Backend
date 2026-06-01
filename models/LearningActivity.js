import mongoose from "mongoose";

const learningActivitySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "account_registered",
        "user_logged_in",
        "course_enrolled",
        "assignment_submitted",
        "module_completed",
        "lesson_started",
        "live_class_joined",
        "xp_awarded",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    isViewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const LearningActivity = mongoose.model("LearningActivity", learningActivitySchema);

export default LearningActivity;
