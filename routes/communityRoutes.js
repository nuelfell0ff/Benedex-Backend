import express from "express";

import {

createJob,
getJobs,
createAlumniProfile,
getAlumni

}
from "../controllers/communityController.js";

import {

protect,
authorize

}
from "../middleware/authMiddleware.js";

const router = express.Router();



// Jobs
router.post(
"/jobs",
protect,
authorize(
"admin",
"instructor"
),
createJob
);

router.get(
"/jobs",
protect,
getJobs
);



// Alumni
router.post(
"/alumni",
protect,
createAlumniProfile
);

router.get(
"/alumni",
protect,
getAlumni
);

export default router;