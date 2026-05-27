import User from "../models/User.js";
import Course from "../models/Course.js";
import Payment from "../models/Payment.js";
import Submission from "../models/Submission.js";



export const getAdminAnalytics =
async(req,res)=>{

try{

// Users
const totalStudents =
await User.countDocuments({
role:"student"
});

const totalInstructors =
await User.countDocuments({
role:"instructor"
});



// Courses
const totalCourses =
await Course.countDocuments();



// Enrollments
const courses =
await Course.find();

const totalEnrollments =
courses.reduce(

(total,course)=>

total + course.students.length,

0

);



// Revenue
const successfulPayments =
await Payment.find({

status:"success"

});

const totalRevenue =
successfulPayments.reduce(

(total,payment)=>

total + payment.amount,

0

);




// Pending submissions
const pendingSubmissions =
await Submission.countDocuments({

status:"pending"

});




// Recent payments
const recentPayments =
await Payment.find({

status:"success"

})

.populate(
"student",
"fullName email"
)

.populate(
"course",
"title"
)

.sort({
createdAt:-1
})

.limit(5);




res.json({

overview:{

totalStudents,
totalInstructors,
totalCourses,
totalEnrollments,
totalRevenue,
pendingSubmissions

},

recentPayments

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};