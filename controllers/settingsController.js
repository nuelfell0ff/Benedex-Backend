import Settings from "../models/Settings.js";



// Get settings
export const getSettings =
async(req,res)=>{

try{

let settings =
await Settings.findOne();


// create default settings automatically
if(!settings){

settings =
await Settings.create({});

}

res.json(settings);

}

catch(error){

res.status(500).json({

message:error.message

});

}

};




// Update settings
export const updateSettings =
async(req,res)=>{

try{

let settings =
await Settings.findOne();


if(!settings){

settings =
await Settings.create({});
}


settings.platformName =
req.body.platformName ||
settings.platformName;


settings.logo =
req.body.logo ||
settings.logo;


settings.contact =
req.body.contact ||
settings.contact;


settings.socialLinks =
req.body.socialLinks ||
settings.socialLinks;


settings.homepage =
req.body.homepage ||
settings.homepage;


settings.paymentSettings =
req.body.paymentSettings ||
settings.paymentSettings;


await settings.save();


res.json({

message:"Settings updated",

settings

});

}

catch(error){

res.status(500).json({

message:error.message

});

}

};