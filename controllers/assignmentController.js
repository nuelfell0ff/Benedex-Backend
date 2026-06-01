import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Course from "../models/Course.js";
import cloudinary from "../config/cloudinary.js";

import {
  applyXpToUser,
  recordLearningActivity
}
from "../utils/studentLearning.js";



// CREATE ASSIGNMENT

export const createAssignment =
async (req, res) => {

  try {

    const assignment =
      await Assignment.create({

        title: req.body.title,

        description:
          req.body.description,

        module:
          req.body.module,

        dueDate:
          req.body.dueDate

      });

    res.status(201).json(
      assignment
    );

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};



// SUBMIT ASSIGNMENT

export const submitAssignment =
async (req, res) => {

  try {

    if (!req.file) {

      return res.status(400).json({

        message:
          "No file uploaded"

      });

    }



    const assignment =
      await Assignment.findById(
        req.body.assignment
      )

      .populate({

        path: "module",

        populate: {

          path: "course"

        }

      });



    if (!assignment) {

      return res.status(404).json({

        message:
          "Assignment not found"

      });

    }



    const enrolled =
      assignment.module.course.students.some(

        student =>

          student.toString() ===
          req.user._id.toString()

      );



    if (!enrolled) {

      return res.status(403).json({

        message:
          "You are not enrolled in this course"

      });

    }



    const existingSubmission =
      await Submission.findOne({

        student:
          req.user._id,

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
        `Submitted ${assignment.title}`,

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



// GET ASSIGNMENTS

export const getAssignments =
async (req, res) => {

  try {

    // ADMIN & INSTRUCTOR

    if (

      req.user.role === "admin" ||

      req.user.role === "instructor"

    ) {

      const assignments =
        await Assignment.find()

        .populate({

          path: "module",

          populate: {

            path: "course",

            select: "title"

          }

        });

      return res.json(
        assignments
      );

    }



    // STUDENT

    const enrolledCourses =
      await Course.find({

        students:
          req.user._id

      })

      .select("_id");



    const courseIds =
      enrolledCourses.map(

        course =>

          course._id.toString()

      );



    const assignments =
      await Assignment.find()

      .populate({

        path: "module",

        populate: {

          path: "course",

          select:
            "title"

        }

      });



    const filteredAssignments =
      assignments.filter(

        assignment => {

          const courseId =
            assignment
              ?.module
              ?.course
              ?._id
              ?.toString();

          return courseIds.includes(
            courseId
          );

        }

      );



    res.json(
      filteredAssignments
    );

  }

  catch (error) {

    res.status(500).json({

      message:
        error.message

    });

  }

};



// GET MY SUBMISSIONS

export const getMySubmissions =
async (req, res) => {

  try {

    const submissions =
      await Submission.find({

        student:
          req.user._id

      })

      .populate({

        path:
          "assignment",

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



// GET ALL SUBMISSIONS

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

        path:
          "assignment",

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



// GRADE SUBMISSION

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
