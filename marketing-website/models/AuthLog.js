import mongoose from 'mongoose';

const authLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  ownerId: { type: String },
  email: { type: String, required: true },
  role: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  deviceName: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

authLogSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model('AuthLog', authLogSchema);


