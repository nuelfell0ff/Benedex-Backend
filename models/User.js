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
            required: true
        },

        role: {
            type: String,
            enum: ["student", "admin", "instructor"],
            default: "student"
        },

        status: {
            type: String,
            enum: [
                "active",
                "suspended"
            ],
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
        ]

    },
    {
        timestamps: true
    }
);

const User = mongoose.model(
    "User",
    userSchema
);

export default User;