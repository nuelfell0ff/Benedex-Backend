import User from "../models/User.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import Submission from "../models/Submission.js";

export const getStudentDashboard =
async(req,res)=>{

try{

const user = await User.findById(
req.user._id
)
.select("-password");



const enrolledCourses =
await Course.find({

students:req.user._id

})

.populate(
"instructor",
"fullName"
);



const progress =
await Progress.find({

student:req.user._id

})

.populate(
"course",
"title"
);




const submissions =
await Submission.find({

student:req.user._id

})

.populate({

path:"assignment",
select:"title"
});




res.json({

profile:user,

xp:user.xp,

badges:user.badges,

enrolledCourses,

progress,

submissions

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};