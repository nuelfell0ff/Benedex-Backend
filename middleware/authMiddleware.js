import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req,res,next)=>{

try{

let token;

if(
req.headers.authorization &&
req.headers.authorization.startsWith("Bearer")
){

token = req.headers.authorization.split(" ")[1];

const decoded = jwt.verify(
token,
process.env.JWT_SECRET
);

req.user = await User.findById(
decoded.id
).select("-password");

next();

}else{

return res.status(401).json({
message:"No token, access denied"
});

}

}catch(error){

return res.status(401).json({
message:"Token invalid"
});

}

};


const authorize = (...roles)=>{

return (req,res,next)=>{

if(
!roles.includes(req.user.role)
){

return res.status(403).json({

message:
`Role ${req.user.role} not authorized`

});

}

next();

};

};

export {
protect,
authorize
};