import mongoose from "mongoose";

const courseGenerationJobSchema =
  new mongoose.Schema(
    {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        default: null,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "generating",
          "completed",
          "failed",
        ],
        default: "pending",
      },

      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      currentStep: {
        type: String,
        default: "Preparing course generation...",
      },

      error: {
        type: String,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

const CourseGenerationJob =
  mongoose.model(
    "CourseGenerationJob",
    courseGenerationJobSchema
  );

export default CourseGenerationJob;