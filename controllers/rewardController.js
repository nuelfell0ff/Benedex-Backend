import User from "../models/User.js";



export const addXP = async(req,res)=>{

try{

const {

studentId,
xp

}=req.body;


const user = await User.findById(
studentId
);


if(!user){

return res.status(404).json({

message:"Student not found"

});

}


user.xp += xp;



// Badge Logic

if(
user.xp >= 100 &&
!user.badges.includes(
"Beginner"
)
){

user.badges.push(
"Beginner"
);

}



if(
user.xp >= 300 &&
!user.badges.includes(
"Intermediate"
)
){

user.badges.push(
"Intermediate"
);

}



if(
user.xp >= 600 &&
!user.badges.includes(
"Advanced"
)
){

user.badges.push(
"Advanced"
);

}



if(
user.xp >= 1000 &&
!user.badges.includes(
"Expert"
)
){

user.badges.push(
"Expert"
);

}


await user.save();


res.json({

message:"XP updated",

xp:user.xp,

badges:user.badges

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};