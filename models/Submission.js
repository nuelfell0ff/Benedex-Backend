import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true
    },

    fileUrl: {
      type: String,
      required: true
    },

    grade: {
      type: Number,
      default: null
    },

    feedback: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "pending",
        "reviewed"
      ],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

/*
 Prevent duplicate submissions
 One student can submit
 one assignment only once
*/

submissionSchema.index(
  {
    student: 1,
    assignment: 1
  },
  {
    unique: true
  }
);

const Submission = mongoose.model(
  "Submission",
  submissionSchema
);

export default Submission;
