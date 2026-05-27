import Module from "../models/Module.js";
import Progress from "../models/Progress.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";


// Create module
export const createModule = async(req,res)=>{

try{

const moduleData = await Module.create({

title:req.body.title,
description:req.body.description,
course:req.body.course,
month:req.body.month,
order:req.body.order,
content:req.body.content

});

res.status(201).json(moduleData);

}
catch(error){

res.status(500).json({
message:error.message
});

}

};




// Get all modules
export const getAllModules = async(req,res)=>{

try{

const modules = await Module.find()
.populate(
"course",
"title"
)
.sort({
month:1,
order:1
});

res.json(modules);

}

catch(error){

res.status(500).json({
message:error.message
});

}

};




// Drip-content logic using assignment completion
export const getCourseModules = async(req,res)=>{

try{

const modules = await Module.find({

course:req.params.courseId

})
.sort({

month:1,
order:1

});



const assignments =
await Assignment.find()

.populate(
"module"
);



const submissions =
await Submission.find({

student:req.user._id

});



let unlockedMonth = 1;



const submittedAssignmentIds =
submissions.map(

submission =>

submission.assignment.toString()

);



// Month 1 assignments
const monthOneAssignments =
assignments.filter(

assignment =>

assignment.module &&
assignment.module.month === 1

);


// Month 2 assignments
const monthTwoAssignments =
assignments.filter(

assignment =>

assignment.module &&
assignment.module.month === 2

);



// Unlock month 2
if(

monthOneAssignments.length > 0 &&

monthOneAssignments.every(

assignment =>

submittedAssignmentIds.includes(
assignment._id.toString()
)

)

){

unlockedMonth = 2;

}



// Unlock month 3
if(

monthTwoAssignments.length > 0 &&

monthTwoAssignments.every(

assignment =>

submittedAssignmentIds.includes(
assignment._id.toString()
)

)

){

unlockedMonth = 3;

}



const filteredModules =
modules.filter(

module =>

module.month <= unlockedMonth

);



res.json(filteredModules);

}
catch(error){

res.status(500).json({

message:error.message

});

}

};