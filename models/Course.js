import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true
    },

    slug:{
        type:String,
        required:true,
        unique:true
    },

    description:{
        type:String,
        required:true
    },

    instructor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    duration:{
        type:String,
        default:"3 Months"
    },

    price:{
        type:Number,
        required:true
    },

    tools:[
        {
            type:String
        }
    ],

    image:{
        type:String
    },

    students:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ]

},
{
    timestamps:true
});

const Course = mongoose.model(
    "Course",
    courseSchema
);

export default Course;