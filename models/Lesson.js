import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["video", "text", "document"],
      required: true,
      default: "text",
    },

    content: {
      type: String,
      default: "",
    },

    videoUrl: {
      type: String,
      default: "",
    },

    documentUrl: {
      type: String,
      default: "",
    },

    // Unsplash stock photo URL fetched during AI syllabus generation
    illustrationUrl: {
      type: String,
      default: "",
    },

    // Attribution requirements for Unsplash Production API guidelines
    photographerName: {
      type: String,
      default: "",
    },

    photographerUrl: {
      type: String,
      default: "",
    },

    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },

    order: {
      type: Number,
      required: true,
    },

    isPreview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;