import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import cloudinary from "../config/cloudinary.js";

import {
  applyXpToUser,
  recordLearningActivity
}
from "../utils/studentLearning.js";



// Create Assignment

export const createAssignment =
async (req, res) => {

  try {

    const assignment =
      await Assignment.create({

        title: req.body.title,
        description: req.body.description,
        module: req.body.module,
        dueDate: req.body.dueDate

      });

    res.status(201).json(
      assignment
    );

  }

  catch (error) {

    res.status(500).json({

      message: error.message

    });

  }

};



// Submit Assignment

export const submitAssignment =
async (req, res) => {

  try {

    if (!req.file) {

      return res.status(400).json({

        message:
          "No file uploaded"

      });

    }



    const existingSubmission =
      await Submission.findOne({

        student: req.user._id,

        assignment:
          req.body.assignment

      });



    if (existingSubmission) {

      return res.status(400).json({

        message:
          "You have already submitted this assignment"

      });

    }



    const fileBase64 =
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;



    const uploadedFile =
      await cloudinary.uploader.upload(

        fileBase64,

        {
          folder:
            "benedex-assignments",

          resource_type:
            "auto"
        }

      );



    const submission =
      await Submission.create({

        student:
          req.user._id,

        assignment:
          req.body.assignment,

        fileUrl:
          uploadedFile.secure_url

      });



    const assignment =
      await Assignment.findById(
        req.body.assignment
      )
      .select("title");



    await applyXpToUser(
      req.user,
      25
    );



    await recordLearningActivity({

      student:
        req.user._id,

      type:
        "assignment_submitted",

      title:
        `Submitted ${assignment?.title || "Assignment"}`,

      points:
        25

    });



    res.status(201).json({

      message:
        "Assignment submitted successfully",

      submission

    });

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};



// Get Assignments

export const getAssignments =
async (req, res) => {

  try {

    const assignments =
      await Assignment.find()

      .populate({

        path: "module",

        select:
          "title month"

      });

    res.json(
      assignments
    );

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};



// Student Submissions

export const getMySubmissions =
async (req, res) => {

  try {

    const submissions =
      await Submission.find({

        student:
          req.user._id

      })

      .populate({

        path: "assignment",

        select:
          "title dueDate"

      });

    res.json(
      submissions
    );

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};



// Instructor/Admin

export const getSubmissions =
async (req, res) => {

  try {

    const submissions =
      await Submission.find()

      .populate(
        "student",
        "fullName email"
      )

      .populate({

        path: "assignment",

        select:
          "title dueDate"

      });

    res.json(
      submissions
    );

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};



// Grade Submission

export const gradeSubmission =
async (req, res) => {

  try {

    const submission =
      await Submission.findById(
        req.params.id
      );



    if (!submission) {

      return res.status(404).json({

        message:
          "Submission not found"

      });

    }



    submission.grade =
      Number(
        req.body.grade
      );

    submission.feedback =
      req.body.feedback;

    submission.status =
      "reviewed";



    await submission.save();



    res.json({

      message:
        "Submission graded successfully",

      submission

    });

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};
