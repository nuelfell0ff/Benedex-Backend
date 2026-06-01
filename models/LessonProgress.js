import mongoose from "mongoose";

const lessonProgressSchema =
new mongoose.Schema({

  student:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  },

  lesson:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Lesson"
  },

  completed:{
    type:Boolean,
    default:false
  }

},
{
  timestamps:true
});

const LessonProgress =
mongoose.model(
  "LessonProgress",
  lessonProgressSchema
);

export default LessonProgress;
