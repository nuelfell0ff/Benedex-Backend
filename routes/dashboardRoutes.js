import express from "express";

import {
getStudentDashboard
}
from "../controllers/dashboardController.js";

import {
protect
}
from "../middleware/authMiddleware.js";

const router = express.Router();


router.get(
"/student",
protect,
getStudentDashboard
);


export default router;