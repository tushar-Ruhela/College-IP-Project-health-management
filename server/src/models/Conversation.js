import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    default: () => Date.now()
  },
  toolCalls: [{
    tool: String,
    args: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed
  }]
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  summary: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Number,
    default: () => Date.now(),
    index: true
  },
  updatedAt: {
    type: Number,
    default: () => Date.now()
  }
}, {
  timestamps: false // We're using custom timestamps
});

// Update updatedAt before saving
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
conversationSchema.index({ phoneNumber: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, createdAt: -1 });

export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);



