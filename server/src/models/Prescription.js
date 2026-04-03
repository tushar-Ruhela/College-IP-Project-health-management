import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientPhoneNumber: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  doctorName: String,
  appointmentId: {
    type: String,
    index: true
  },
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: String, // e.g., "500mg"
    frequency: String, // e.g., "twice daily", "after meals"
    duration: String, // e.g., "7 days", "2 weeks"
    instructions: String, // Additional instructions
    quantity: String
  }],
  date: {
    type: Number, // Timestamp
    required: true,
    default: () => Date.now()
  },
  instructions: String, // General instructions
  followUpDate: Number, // Timestamp for follow-up if needed
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
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
  timestamps: false
});

// Index for patient queries
prescriptionSchema.index({ patientId: 1, date: -1 });
prescriptionSchema.index({ patientPhoneNumber: 1, date: -1 });
prescriptionSchema.index({ appointmentId: 1 });

// Update updatedAt before saving
prescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);

