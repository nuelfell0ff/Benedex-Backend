import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true
    },

    description:{
        type:String,
        required:true
    },

    module:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Module",
        required:true
    },

    dueDate:{
        type:Date
    }

},
{
    timestamps:true
});

const Assignment = mongoose.model(
    "Assignment",
    assignmentSchema
);

export default Assignment;