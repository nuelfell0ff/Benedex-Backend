import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { recordLearningActivity } from "../utils/studentLearning.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register standard email user
export const registerUser = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role
        });

        if (user.role === "student") {
            await recordLearningActivity({
                student: user._id,
                type: "account_registered",
                title: "Created your account",
                points: 0
            });
        }

        res.status(201).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Standard email/password login
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Safety catch if a Google-only user tries traditional login without setting a password
        if (!user.password) {
            return res.status(400).json({ 
                message: "Account registered using Google Auth. Please sign in via Google." 
            });
        }

        if (await bcrypt.compare(password, user.password)) {
            if (user.role === "student") {
                await recordLearningActivity({
                    student: user._id,
                    type: "user_logged_in",
                    title: "Logged in",
                    points: 0
                });
            }

            res.json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Handle incoming token payloads signed from Google client frontend
export const googleAuthCallbackSuccess = async (req, res) => {
    try {
        const { credential } = req.body; // Token sent by the frontend Google Login button

        if (!credential) {
            return res.status(400).json({ message: "Google verification token missing." });
        }

        // Cryptographically verify the token directly with Google's public security keys
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload['sub']; // Google's unique structural ID for this specific user
        const email = payload['email'];
        const fullName = payload['name'];
        const profileImage = payload['picture'];

        // Find or create the user record matching by Google Account Parameters
        let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

        if (!user) {
            user = await User.create({
                fullName,
                email,
                googleId,
                profileImage: profileImage || "",
                role: "student"
            });

            await recordLearningActivity({
                student: user._id,
                type: "account_registered",
                title: "Created your account via Google",
                points: 0
            });
        } else if (!user.googleId) {
            // Securely link Google identity to existing local profile if emails align
            user.googleId = googleId;
            if (!user.profileImage && profileImage) user.profileImage = profileImage;
            await user.save();
        }

        // Return your system's native JWT token back to the frontend
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: "Google Authentication engine token validation failure: " + error.message });
    }
};

// @desc    Generate password reset token string vectors
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "No user account matched with that email address." });
        }

        // Generate short random crypto string tokens
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Hash it before pinning inside database node for protection parameters
        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpires = Date.now() + 3600000; // Token expires precisely in 1 Hour

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password verification token successfully initialized.",
            resetToken: resetToken // Hand token over back safely to interface routing pipelines
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset operational entry parameters with validated security token
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Reset token is invalid or has expired." });
        }

        // Encrypt the new target password entry string
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Wipe security token parameters cleanly on success
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password successfully updated! You can now log in with your new credentials."
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
