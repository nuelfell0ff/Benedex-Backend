import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  adminName: {
    type: String, // e.g., "Emmanuel", "Ojo", "Ola"
    required: true
  },
  module: {
    type: String,
    enum: ['USERS', 'COURSES', 'PAYMENT', 'ANALYTICS', 'NOTIFICATIONS', 'SUPPORT_TICKETS', 'SETTINGS'],
    required: true
  },
  actionType: {
    type: String, 
    enum: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'], 
    required: true
  },
  details: {
    type: String, // e.g., "Deleted course: 'Advanced React Architecture'"
    required: true
  },
  ipAddress: {
    type: String
  },
  device: {
    type: String // Captures browser version or tool used
  }
}, { timestamps: true }); // Captures exact date and time natively

export default mongoose.model('ActivityLog', activityLogSchema);