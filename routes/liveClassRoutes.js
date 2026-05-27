import express from "express";

import {

createLiveClass,
getCourseLiveClasses

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

"/:courseId",

protect,

getCourseLiveClasses

);

export default router;