import express from "express";

import {
addXP
}
from "../controllers/rewardController.js";

import {
protect,
authorize
}
from "../middleware/authMiddleware.js";

const router = express.Router();



router.post(
"/xp",
protect,
authorize(
"admin",
"instructor"
),
addXP
);


export default router;