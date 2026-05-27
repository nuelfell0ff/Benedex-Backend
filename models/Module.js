import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true
    },

    description:{
        type:String,
        default:""
    },

    course:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Course",
        required:true
    },

    month:{
        type:Number,
        required:true
    },

    order:{
        type:Number,
        required:true
    },

    content:[
        {
            title:String,
            videoUrl:String,
            resourceUrl:String
        }
    ]

},
{
    timestamps:true
});

const Module = mongoose.model(
    "Module",
    moduleSchema
);

export default Module;