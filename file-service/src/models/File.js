import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    max: 50 * 1024 * 1024 // 50MB limit
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true // Index for faster queries by user
  },
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  contentType: {
    type: String,
    default: 'application/octet-stream'
  }
}, {
  timestamps: true
});

// Index for efficient user file queries
fileSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('File', fileSchema);
