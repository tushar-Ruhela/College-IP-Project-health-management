import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  doctorId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: String,
  availability: {
    type: Map,
    of: {
      start: String,
      end: String,
      available: {
        type: Boolean,
        default: true
      }
    },
    default: {}
  },
  metadata: {
    hospital: String,
    experience: String,
    qualifications: [String]
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

doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
