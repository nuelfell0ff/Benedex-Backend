import User from "../models/User.js";
import bcrypt from "bcryptjs";




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

// create new user
export const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, status } = req.body;

    // 1. Basic validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all required fields (Full Name, Email, Password)"
      });
    }

    // 2. Check if the user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "A user with this email address already exists"
      });
    }

    // 3. Hash the admin-typed password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the new user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: role || "student", // Defaults to student if admin leaves it blank
      status: status || "active" // Defaults to active
    });

    // 5. Return user data without sending back the password field
    const createdUser = await User.findById(newUser._id).select("-password");

    res.status(201).json({
      message: "User created successfully",
      user: createdUser
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
