import express from "express";

import {

  createAssignment,
  submitAssignment,
  getAssignments,
  getMySubmissions,
  getSubmissions,
  gradeSubmission

}

from "../controllers/assignmentController.js";

import {

  protect,
  authorize

}

from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();



// Create Assignment

router.post(

  "/",

  protect,

  authorize(
    "admin",
    "instructor"
  ),

  createAssignment

);



// Get Assignments

router.get(

  "/",

  protect,

  getAssignments

);



// Student Submission History

router.get(

  "/my-submissions",

  protect,

  getMySubmissions

);



// Submit Assignment

router.post(

  "/submit",

  protect,

  upload.single("file"),

  submitAssignment

);



// Instructor/Admin View

router.get(

  "/submissions",

  protect,

  authorize(
    "admin",
    "instructor"
  ),

  getSubmissions

);



// Grade Submission

router.put(

  "/grade/:id",

  protect,

  authorize(
    "admin",
    "instructor"
  ),

  gradeSubmission

);

export default router;
