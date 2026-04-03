import mongoose from 'mongoose';

const transcriptItemSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'agent', 'tool_call', 'tool_result'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: String,
  medium: {
    type: String,
    enum: ['voice', 'text'],
    default: 'voice'
  }
}, { _id: false });

const callHistorySchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ultravoxCallId: {
    type: String,
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  callType: {
    type: String,
    enum: ['inbound', 'outbound', 'webrtc'],
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  summary: String,
  shortSummary: String,
  transcript: [transcriptItemSchema],
  duration: String,
  startTime: {
    type: Number,
    required: true,
    index: true
  },
  endTime: Number,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Number,
    default: () => Date.now(),
    index: true
  }
}, {
  timestamps: false
});

export const CallHistory = mongoose.models.CallHistory || mongoose.model('CallHistory', callHistorySchema);

