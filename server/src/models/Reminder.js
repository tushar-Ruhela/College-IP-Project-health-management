import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: String,
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  what: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly', 'twice a day'],
    default: 'once'
  },
  nextCallTime: {
    type: Number,
    required: true,
    index: true
  },
  createdAt: {
    type: Number,
    default: () => Date.now()
  },
  lastCalled: Number,
  callCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    callId: String,
    reminderType: {
      type: String,
      enum: ['medication', 'appointment', 'exercise', 'other']
    }
  }
}, {
  timestamps: false
});

export const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

