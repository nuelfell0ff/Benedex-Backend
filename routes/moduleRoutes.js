import express from "express";

import {
  createModule,
  getCourseModules,
  getAllModules,
  getAdminModuleDetails,
  updateModule,
} from "../controllers/moduleController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("admin", "instructor"),
  createModule
);

router.get(
  "/admin/:id",
  protect,
  authorize("admin"),
  getAdminModuleDetails
);

router.put(
  "/admin/:id",
  protect,
  authorize("admin"),
  updateModule
);

router.get(
  "/",
  protect,
  getAllModules
);

router.get(
  "/:courseId",
  protect,
  authorize("student"),
  getCourseModules
);

export default router;