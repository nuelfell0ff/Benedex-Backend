import User from "../models/User.js";




// Get all users
export const getUsers = async(req,res)=>{

try{

const users =
await User.find()

.select("-password")

.sort({
createdAt:-1
});

res.json(users);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Get one user
export const getSingleUser = async(req,res)=>{

try{

const user =
await User.findById(
req.params.id
)
.select("-password");


if(!user){

return res.status(404).json({

message:"User not found"

});

}

res.json(user);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Change role
export const updateRole = async(req,res)=>{

try{

const user =
await User.findById(
req.params.id
);


if(!user){

return res.status(404).json({

message:"User not found"

});

}


user.role =
req.body.role;


await user.save();


res.json({

message:"Role updated",

user

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Suspend/activate
export const updateStatus =
async(req,res)=>{

try{

const user =
await User.findById(
req.params.id
);


if(!user){

return res.status(404).json({

message:"User not found"

});

}


user.status =
req.body.status;


await user.save();


res.json({

message:"Status updated",

user

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Delete user
export const deleteUser =
async(req,res)=>{

try{

const user =
await User.findById(
req.params.id
);


if(!user){

return res.status(404).json({

message:"User not found"

});

}


await User.findByIdAndDelete(
req.params.id
);


res.json({

message:"User deleted"

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};