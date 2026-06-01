import mongoose from "mongoose";

const lessonSchema =
new mongoose.Schema({

  module:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Module",
    required:true
  },

  title:{
    type:String,
    required:true
  },

  type:{
    type:String,

    enum:[
      "video",
      "text",
      "document",
      "quiz",
      "assignment"
    ],

    required:true
  },

  content:{
    type:String,
    default:""
  },

  videoUrl:{
    type:String,
    default:""
  },

  documentUrl:{
    type:String,
    default:""
  },

  order:{
    type:Number,
    required:true
  },

  isRequired:{
    type:Boolean,
    default:true
  }

},
{
  timestamps:true
});

const Lesson =
mongoose.model(
  "Lesson",
  lessonSchema
);

export default Lesson;
