import Notification from "../models/Notification.js";



// Create notification
export const createNotification = async(req,res)=>{

try{

const notification =
await Notification.create({

user:req.body.user,
title:req.body.title,
message:req.body.message,
type:req.body.type

});

res.status(201).json(
notification
);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Get logged-in user notifications
export const getNotifications =
async(req,res)=>{

try{

const notifications =
await Notification.find({

user:req.user._id

})
.sort({
createdAt:-1
});

res.json(
notifications
);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Mark notification as read
export const markAsRead =
async(req,res)=>{

try{

const notification =
await Notification.findById(
req.params.id
);

if(!notification){

return res.status(404).json({

message:"Notification not found"

});

}

notification.isRead = true;

await notification.save();

res.json({

message:"Notification updated"

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};