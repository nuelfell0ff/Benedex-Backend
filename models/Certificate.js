import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  isPaid: {
    type: Boolean,
    default: false // <-- TRACS PAYMENT STATUS
  },
  paymentReference: {
    type: String,
    default: "" // Store Paystack reference
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
});

CertificateSchema.index({ student: 1, course: 1 }, { unique: true });

const Certificate = mongoose.model("Certificate", CertificateSchema);
export default Certificate;