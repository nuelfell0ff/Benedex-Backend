import Job from "../models/Job.js";
import Alumni from "../models/Alumni.js";



// Create job
export const createJob = async(req,res)=>{

try{

const job = await Job.create({

title:req.body.title,
company:req.body.company,
location:req.body.location,
description:req.body.description,
requirements:req.body.requirements,
salary:req.body.salary,
expiresAt:req.body.expiresAt,
postedBy:req.user._id

});

res.status(201).json(job);

}

catch(error){

res.status(500).json({
message:error.message
});

}

};




// Get jobs
export const getJobs = async(req,res)=>{

try{

const jobs = await Job.find()

.populate(
"postedBy",
"fullName"
)

.sort({
createdAt:-1
});

res.json(jobs);

}

catch(error){

res.status(500).json({
message:error.message
});

}

};




// Create alumni profile
export const createAlumniProfile =
async(req,res)=>{

try{

const alumni =
await Alumni.create({

user:req.user._id,
currentRole:req.body.currentRole,
company:req.body.company,
bio:req.body.bio,
linkedin:req.body.linkedin,
portfolio:req.body.portfolio

});

res.status(201).json(
alumni
);

}

catch(error){

res.status(500).json({
message:error.message
});

}

};




// Get alumni directory
export const getAlumni = async(req,res)=>{

try{

const alumni =
await Alumni.find()

.populate(
"user",
"fullName email profileImage"
);

res.json(
alumni
);

}

catch(error){

res.status(500).json({
message:error.message
});

}

};