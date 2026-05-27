import express from "express";

import {
getAdminAnalytics
}
from "../controllers/adminController.js";

import {
protect,
authorize
}
from "../middleware/authMiddleware.js";

const router = express.Router();



router.get(

"/analytics",

protect,

authorize(
"admin"
),

getAdminAnalytics

);


export default router;