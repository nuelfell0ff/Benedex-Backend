import mongoose from 'mongoose';

const PaymentTicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseName: { type: String, required: true },
    paymentReference: { type: String, required: true, unique: true },
    paymentTime: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'resolved', 'rejected'], 
      default: 'pending' 
    },
    adminNotes: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model('PaymentTicket', PaymentTicketSchema);
