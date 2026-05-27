import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import cloudinary from "../config/cloudinary.js";



// Create Assignment
export const createAssignment = async(req,res)=>{

try{

const assignment =
await Assignment.create({

title:req.body.title,
description:req.body.description,
module:req.body.module,
dueDate:req.body.dueDate

});

res.status(201).json(
assignment
);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Submit Assignment
export const submitAssignment = async(req,res)=>{

try{

if(!req.file){

return res.status(400).json({

message:"No file uploaded"

});

}



const fileBase64 =
`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;



const uploadedFile =
await cloudinary.uploader.upload(

fileBase64,

{

folder:"benedex-assignments",

resource_type:"auto"

}

);



const submission =
await Submission.create({

student:req.user._id,

assignment:req.body.assignment,

fileUrl:uploadedFile.secure_url

});



res.status(201).json({

message:"Assignment submitted",

submission

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};


// Get all submissions
export const getSubmissions = async(req,res)=>{

try{

const submissions =
await Submission.find()

.populate(
"student",
"fullName email"
)

.populate({

path:"assignment",
select:"title"

});

res.json(submissions);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Grade submission
export const gradeSubmission = async(req,res)=>{

try{

const submission =
await Submission.findById(
req.params.id
);

if(!submission){

return res.status(404).json({

message:"Submission not found"

});

}


submission.grade =
req.body.grade;

submission.feedback =
req.body.feedback;

submission.status =
"reviewed";


await submission.save();


res.json({

message:"Submission graded",

submission

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};