import express from "express";
import {
    registerUser,
    loginUser,
    googleAuthCallbackSuccess,
    forgotPassword,
    resetPassword,
    updatePassword // 1. Import your new controller method here
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from '../middleware/rateLimiter.js'; 

const router = express.Router();

// Baseline Core Routes Handler Nodes
router.post("/register", registerUser);
router.post("/login", loginUser);

// 🌐 GOOGLE SOCIAL LINK DATA TUNNEL
router.post("/google", googleAuthCallbackSuccess);

// 🔒 CREDENTIAL PROTECTION RESET ROUTES
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

// 🛠️ PROFILE SECURITY UPDATE VECTOR (Protected Endpoint)
router.put("/update-password", protect, updatePassword);

export default router;
