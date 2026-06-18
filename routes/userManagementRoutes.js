import express from "express";
import {
  getUsers,
  getSingleUser,
  updateRole,
  updateStatus,
  deleteUser,
  createUser 
} from "../controllers/userManagementController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post(
  "/",
  protect,
  authorize("admin"),
  createUser
);

// ... keep all your other router paths below ...
router.get("/", protect, authorize("admin"), getUsers);
router.get("/:id", protect, authorize("admin"), getSingleUser);
router.put("/role/:id", protect, authorize("admin"), updateRole);
router.put("/status/:id", protect, authorize("admin"), updateStatus);
router.delete("/:id", protect, authorize("admin"), deleteUser);

export default router;
