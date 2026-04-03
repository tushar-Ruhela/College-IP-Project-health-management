import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
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
  date: {
    type: String, // ISO date string "2024-01-15"
    required: true
  },
  time: {
    type: String, // Time string "14:30"
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'checkup', 'emergency', 'other'],
    default: 'consultation'
  },
  notes: String,
  reason: String, // Reason for appointment
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

// Compound index for doctor availability queries
appointmentSchema.index({ doctorId: 1, date: 1, time: 1 });
appointmentSchema.index({ patientId: 1, date: 1 });

// Update updatedAt before saving
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

