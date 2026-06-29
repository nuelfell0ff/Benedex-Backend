import mongoose from 'mongoose';

const NotificationSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  expirationTime: {
    type: Number,
    default: null
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  }
}, { timestamps: true });

// Check mongoose.models instead of mongoose.Schema.apps
export default mongoose.models?.NotificationSubscription || mongoose.model('NotificationSubscription', NotificationSubscriptionSchema);