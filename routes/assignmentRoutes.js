import express from "express";

import {

createAssignment,
submitAssignment,
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



// Create assignment
router.post(

"/",

protect,

authorize(
"admin",
"instructor"
),

createAssignment

);



// Student upload assignment
router.post(

"/submit",

protect,

upload.single("file"),

submitAssignment

);



// Get all submissions
router.get(

"/submissions",

protect,

authorize(
"admin",
"instructor"
),

getSubmissions

);




// Grade submission
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