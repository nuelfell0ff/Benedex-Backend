import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({

    student:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    course:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Course",
        required:true
    },

    amount:{
        type:Number,
        required:true
    },

    reference:{
        type:String,
        required:true
    },

    status:{
        type:String,
        enum:[
            "pending",
            "success",
            "failed"
        ],
        default:"pending"
    }

},
{
    timestamps:true
});

const Payment = mongoose.model(
    "Payment",
    paymentSchema
);

export default Payment;