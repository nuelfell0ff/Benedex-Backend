import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["video", "text", "document"],
      required: true
    },

    content: {
      type: String,
      default: ""
    },

    videoUrl: {
      type: String,
      default: ""
    },

    documentUrl: {
      type: String,
      default: ""
    },

    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true
    },

    order: {
      type: Number,
      required: true
    },

    isPreview: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;
