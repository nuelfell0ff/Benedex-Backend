import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true
    },

    company:{
        type:String,
        required:true
    },

    location:{
        type:String,
        default:"Remote"
    },

    description:{
        type:String,
        required:true
    },

    requirements:[
        {
            type:String
        }
    ],

    salary:{
        type:String,
        default:"Negotiable"
    },

    postedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    expiresAt:{
        type:Date
    }

},
{
    timestamps:true
});

const Job = mongoose.model(
    "Job",
    jobSchema
);

export default Job;