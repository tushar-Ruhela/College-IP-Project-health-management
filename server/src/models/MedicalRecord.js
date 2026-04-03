import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  recordId: {
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
  recordType: {
    type: String,
    enum: ['diagnosis', 'lab_result', 'scan', 'vaccination', 'surgery', 'treatment', 'other'],
    required: true
  },
  date: {
    type: Number, // Timestamp
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  doctorId: String,
  doctorName: String,
  attachments: [{
    type: String, // URLs or file paths
    url: String,
    name: String
  }],
  metadata: {
    hospital: String,
    location: String
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
medicalRecordSchema.index({ patientId: 1, date: -1 });
medicalRecordSchema.index({ patientPhoneNumber: 1, date: -1 });

// Update updatedAt before saving
medicalRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const MedicalRecord = mongoose.models.MedicalRecord || mongoose.model('MedicalRecord', medicalRecordSchema);

