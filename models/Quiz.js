import mongoose from "mongoose";

const questionSchema =
new mongoose.Schema({

  question:{
    type:String,
    required:true
  },

  options:[
    {
      type:String
    }
  ],

  correctAnswer:{
    type:String,
    required:true
  }

});

const quizSchema =
new mongoose.Schema({

  title:{
    type:String,
    required:true
  },

  description:{
    type:String,
    default:""
  },

  module:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Module",
    required:true
  },

  passMark:{
    type:Number,
    default:70
  },

  questions:[
    questionSchema
  ]

},
{
  timestamps:true
});

const Quiz =
mongoose.model(
  "Quiz",
  quizSchema
);

export default Quiz;
