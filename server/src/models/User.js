import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    index: true
  },
  name: String,
  email: String,
  dateOfBirth: String, // ISO date string or timestamp
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  allergies: [{
    name: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    notes: String
  }],
  medicalHistory: [{
    condition: String,
    diagnosisDate: String,
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic']
    },
    notes: String
  }],
  emergencyContact: {
    name: String,
    phoneNumber: String,
    relationship: String
  },
  metadata: {
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi']
    },
    location: String,
    timezone: String
  },
  createdAt: {
    type: Number,
    default: () => Date.now()
  },
  updatedAt: {
    type: Number,
    default: () => Date.now()
  }
}, {
  timestamps: false // We're using custom timestamps
});

// Update updatedAt before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);

