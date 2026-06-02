import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";



// Create Quiz
export const createQuiz =
async(req,res)=>{

try{

const quiz =
await Quiz.create({

title:req.body.title,
description:req.body.description,
module:req.body.module,
passMark:req.body.passMark,
questions:req.body.questions

});

res.status(201).json(
quiz
);

}
catch(error){

res.status(500).json({
message:error.message
});

}

};




// Get module quiz
export const getModuleQuiz =
async(req,res)=>{

try{

const quiz =
await Quiz.findOne({

module:req.params.moduleId

});

res.json(
quiz
);

}
catch(error){

res.status(500).json({
message:error.message
});

}

};




// Submit Quiz
export const submitQuiz =
async(req,res)=>{

try{

const quiz =
await Quiz.findById(
req.params.quizId
);

if(!quiz){

return res.status(404).json({
message:"Quiz not found"
});

}

let score = 0;

quiz.questions.forEach(

(question,index)=>{

if(

req.body.answers[index] ===

question.correctAnswer

){

score++;

}

}

);

const percentage =
Math.round(
(score /
quiz.questions.length)
*100
);

const passed =
percentage >=
quiz.passMark;

const attempt =
await QuizAttempt.create({

student:req.user._id,

quiz:quiz._id,

score:percentage,

passed

});

res.json({

score:percentage,

passed,

attempt

});

}
catch(error){

res.status(500).json({
message:error.message
});

}

};
