import mongoose from 'mongoose';

const AiMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Fast queries per user
    },
    role: {
      type: String,
      enum: ['user', 'model'], // 'model' is what Gemini expects for its history array
      required: true
    },
    message: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('AiMessage', AiMessageSchema);
