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
      enum: ["course_enrolled", "assignment_submitted", "xp_awarded", "module_completed"],
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
  },
  {
    timestamps: true,
  }
);

const LearningActivity = mongoose.model("LearningActivity", learningActivitySchema);

export default LearningActivity;
