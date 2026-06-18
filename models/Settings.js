import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({

    platformName:{
        type:String,
        default:"Benedex Digital Hub"
    },

    // NEW: Add this execution flag so your database can track maintenance state
    maintenanceMode:{
        type:Boolean,
        default:false
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
    // ... keep the rest of your existing socialLinks, homepage, and paymentSettings configuration arrays exactly as they are
