const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'raw' }, 
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shareLink: {
    token: { type: String },
    expiresAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);