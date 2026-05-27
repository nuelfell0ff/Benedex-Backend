import mongoose from "mongoose";

const alumniSchema = new mongoose.Schema({

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    currentRole:{
        type:String,
        default:""
    },

    company:{
        type:String,
        default:""
    },

    bio:{
        type:String,
        default:""
    },

    linkedin:{
        type:String,
        default:""
    },

    portfolio:{
        type:String,
        default:""
    }

},
{
    timestamps:true
});

const Alumni = mongoose.model(
    "Alumni",
    alumniSchema
);

export default Alumni;