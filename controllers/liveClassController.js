import LiveClass from "../models/LiveClass.js";



// Create live class
export const createLiveClass = async(req,res)=>{

try{

const liveClass =
await LiveClass.create({

title:req.body.title,
description:req.body.description,
course:req.body.course,
meetingLink:req.body.meetingLink,
platform:req.body.platform,
startTime:req.body.startTime,
endTime:req.body.endTime,
instructor:req.user._id

});

res.status(201).json(
liveClass
);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Get classes for a course
export const getCourseLiveClasses =
async(req,res)=>{

try{

const classes =
await LiveClass.find({

course:req.params.courseId

})

.populate(
"instructor",
"fullName"
)

.sort({
startTime:1
});

res.json(
classes
);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};