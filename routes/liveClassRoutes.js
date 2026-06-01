import express from "express";

import {

  createLiveClass,
  getCourseLiveClasses,
  getStudentLiveClasses,
  joinLiveClass

}
  from "../controllers/liveClassController.js";

import {

  protect,
  authorize

}
  from "../middleware/authMiddleware.js";

const router = express.Router();



// Create class
router.post(

  "/",

  protect,

  authorize(
    "admin",
    "instructor"
  ),

  createLiveClass

);



// Get class list
router.get(
  "/student",
  protect,
  authorize("student"),
  getStudentLiveClasses
);

// Join class
router.post(
  "/join/:classId",
  protect,
  authorize("student"),
  joinLiveClass
);

// Get class list by course
router.get(

  "/:courseId",

  protect,

  getCourseLiveClasses

);

export default router;