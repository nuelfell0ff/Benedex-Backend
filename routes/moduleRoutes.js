import express from "express";

import {

createModule,
getCourseModules,
getAllModules

}
from "../controllers/moduleController.js";

import {

protect,
authorize

}
from "../middleware/authMiddleware.js";

const router = express.Router();


// Create module
router.post(
"/",
protect,
authorize("admin","instructor"),
createModule
);


// Get all modules
router.get(
"/",
protect,
getAllModules
);


// Get modules by course with drip logic
router.get(
"/:courseId",
protect,
getCourseModules
);


export default router;