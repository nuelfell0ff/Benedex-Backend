import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({

    platformName:{
        type:String,
        default:"Benedex Digital Hub"
    },

    logo:{
        type:String,
        default:""
    },

    contact:{

        email:{
            type:String,
            default:""
        },

        phone:{
            type:String,
            default:""
        },

        address:{
            type:String,
            default:""
        }

    },

    socialLinks:{

        facebook:{
            type:String,
            default:""
        },

        instagram:{
            type:String,
            default:""
        },

        linkedin:{
            type:String,
            default:""
        },

        twitter:{
            type:String,
            default:""
        }

    },

    homepage:{

        heroTitle:{
            type:String,
            default:""
        },

        heroSubtitle:{
            type:String,
            default:""
        },

        heroButtonText:{
            type:String,
            default:"Apply Now"
        }

    },

    paymentSettings:{

        currency:{
            type:String,
            default:"NGN"
        },

        allowInstallments:{
            type:Boolean,
            default:false
        }

    }

},
{
    timestamps:true
});

const Settings = mongoose.model(
    "Settings",
    settingsSchema
);

export default Settings;