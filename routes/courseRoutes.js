import express from "express";

import {

createCourse,
getCourses,
getSingleCourse,
enrollCourse,
getStudentCourses,

}
from "../controllers/courseController.js";

import {

protect,
authorize

}
from "../middleware/authMiddleware.js";

const router = express.Router();


// Create Course
router.post(
"/",
protect,
authorize(
"admin",
"instructor"
),
createCourse
);


// Get all courses
router.get(
"/",
getCourses
);


// Get single course
router.get(
"/:id",
getSingleCourse
);


// Student enroll
router.post(
"/enroll/:courseId",
protect,
authorize(
"student"
),
enrollCourse
);

// get student courses
router.get(
    "/student/registered", 
    protect, 
    authorize(
        "student"
    ),
    getStudentCourses);


export default router;
