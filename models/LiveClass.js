import mongoose from "mongoose";

const liveClassSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: ""
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },

    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    meetingLink: {
        type: String,
        required: true
    },

    platform: {
        type: String,
        enum: [
            "zoom",
            "google-meet"
        ],
        default: "zoom"
    },

    startTime: {
        type: Date,
        required: true
    },

    endTime: {
        type: Date,
        required: true
    },

    attendees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]

},
    {
        timestamps: true
    });

const LiveClass = mongoose.model(
    "LiveClass",
    liveClassSchema
);

export default LiveClass;