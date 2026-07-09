import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
            required: function() {
                // Only require a local password if the account didn't sign up via Google OAuth
                return !this.googleId;
            }
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true // Allows multiple users to have 'undefined' local passwords securely
        },
        role: {
            type: String,
            enum: ["student", "admin", "instructor"],
            default: "student"
        },
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active"
        },
        profileImage: {
            type: String,
            default: ""
        },
        xp: {
            type: Number,
            default: 0
        },
        badges: [
            {
                type: String
            }
        ],
        // 🔒 SECURITY TOKENS FOR RESET CONTROL PASSWORD MATRIX
        resetPasswordToken: String,
        resetPasswordExpires: Date
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);
export default User;
