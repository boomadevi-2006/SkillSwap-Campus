const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['request', 'completion_request', 'info'], required: true },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
