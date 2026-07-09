import express from "express";
import {
    registerUser,
    loginUser,
    googleAuthCallbackSuccess,
    forgotPassword,
    resetPassword
} from "../controllers/authController.js";

const router = express.Router();

// Baseline Core Routes Handler Nodes
router.post("/register", registerUser);
router.post("/login", loginUser);

// 🌐 GOOGLE SOCIAL LINK DATA TUNNEL
router.post("/google", googleAuthCallbackSuccess);

// 🔒 CREDENTIAL PROTECTION RESET ROUTES
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

export default router;
