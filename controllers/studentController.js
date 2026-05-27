export const studentDashboard = async(req,res)=>{

res.json({

message:
`Welcome ${req.user.fullName}`,

user:req.user

});

};


export const adminDashboard = async(req,res)=>{

res.json({

message:
"Welcome Admin"

});

};