import { Router } from 'express';
import { Doctor } from '../models/Doctor.js';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Prescription } from '../models/Prescription.js';

const router = Router();

/**
 * GET /api/doctors/current
 * Get current doctor profile (by doctorId query param or first doctor for demo)
 */
router.get('/current', async (req, res) => {
  try {
    const { doctorId } = req.query;

    let doctor;
    if (doctorId) {
      doctor = await Doctor.findOne({ doctorId });
    } else {
      // For demo, get first doctor or create a default
      doctor = await Doctor.findOne();
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Format availability for frontend
    const availability = [];
    if (doctor.availability) {
      for (const [day, schedule] of doctor.availability.entries()) {
        if (schedule.available) {
          availability.push({
            day: parseInt(day),
            start: schedule.start,
            end: schedule.end
          });
        }
      }
    }

    res.json({
      success: true,
      name: doctor.name,
      location: doctor.metadata?.hospital || 'Not set',
      services: `${doctor.specialization} consultation`,
      specialty: doctor.specialization,
      availableTime: availability.length > 0 
        ? `Weekdays · ${availability[0]?.start || '09:00'} - ${availability[0]?.end || '17:00'}`
        : 'Not set',
      doctorId: doctor.doctorId,
      email: doctor.email,
      phoneNumber: doctor.phoneNumber,
      experience: doctor.metadata?.experience,
      qualifications: doctor.metadata?.qualifications || []
    });
  } catch (error) {
    console.error('❌ Error getting doctor profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get doctor profile'
    });
  }
});

/**
 * POST /api/doctors
 * Create or update doctor profile
 */
router.post('/', async (req, res) => {
  try {
    const { doctorId, name, location, specialty, email, phoneNumber, availableTime, experience, qualifications } = req.body;

    if (!name || !specialty || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'name, specialty, and phoneNumber are required'
      });
    }

    // Parse availableTime if provided (format: "Weekdays · 09:00 - 17:00")
    let availability = new Map();
    if (availableTime) {
      const timeMatch = availableTime.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
      if (timeMatch) {
        const start = `${timeMatch[1]}:${timeMatch[2]}`;
        const end = `${timeMatch[3]}:${timeMatch[4]}`;
        // Set availability for weekdays (1-5)
        for (let day = 1; day <= 5; day++) {
          availability.set(String(day), {
            start,
            end,
            available: true
          });
        }
      }
    }

    const doctorData = {
      doctorId: doctorId || `doc_${Date.now()}`,
      name,
      specialization: specialty,
      phoneNumber,
      email,
      availability,
      metadata: {
        hospital: location,
        experience,
        qualifications: qualifications || []
      }
    };

    let doctor = await Doctor.findOne({ doctorId: doctorData.doctorId });
    if (doctor) {
      // Update existing
      Object.assign(doctor, doctorData);
      await doctor.save();
    } else {
      // Create new
      doctor = new Doctor(doctorData);
      await doctor.save();
    }

    res.json({
      success: true,
      doctor: {
        doctorId: doctor.doctorId,
        name: doctor.name,
        location: doctor.metadata?.hospital,
        specialty: doctor.specialization,
        availableTime
      }
    });
  } catch (error) {
    console.error('❌ Error creating/updating doctor:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create/update doctor profile'
    });
  }
});

/**
 * GET /api/doctors/appointments
 * Get appointments for a doctor
 */
router.get('/appointments', async (req, res) => {
  try {
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: 'doctorId is required'
      });
    }

    const appointments = await Appointment.find({ doctorId })
      .sort({ date: 1, time: 1 })
      .limit(50);

    // Get patient names
    const patientPhoneNumbers = [...new Set(appointments.map(apt => apt.patientPhoneNumber))];
    const patients = await User.find({ phoneNumber: { $in: patientPhoneNumbers } });
    const patientMap = new Map(patients.map(p => [p.phoneNumber, p]));

    const formattedAppointments = appointments.map(apt => {
      const patient = patientMap.get(apt.patientPhoneNumber);
      const dateTime = new Date(`${apt.date}T${apt.time}`);
      
      return {
        id: apt.appointmentId,
        patientName: patient?.name || apt.patientPhoneNumber,
        start: dateTime.getTime(),
        end: dateTime.getTime() + (30 * 60 * 1000), // 30 min default
        type: apt.type || 'consultation',
        channel: 'Video consult', // Default
        notes: apt.reason || apt.notes || '',
        status: apt.status,
        date: apt.date,
        time: apt.time
      };
    });

    res.json({
      success: true,
      appointments: formattedAppointments
    });
  } catch (error) {
    console.error('❌ Error getting appointments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get appointments'
    });
  }
});

/**
 * GET /api/doctors/patients
 * Get patients for a doctor (patients who have appointments)
 */
router.get('/patients', async (req, res) => {
  try {
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: 'doctorId is required'
      });
    }

    // Get unique patient phone numbers from appointments
    const appointments = await Appointment.find({ doctorId }).distinct('patientPhoneNumber');
    
    // Get patient details
    const patients = await User.find({ phoneNumber: { $in: appointments } });

    // Get latest medical records and prescriptions for each patient
    const patientData = await Promise.all(patients.map(async (patient) => {
      const latestRecord = await MedicalRecord.findOne({ patientPhoneNumber: patient.phoneNumber })
        .sort({ createdAt: -1 });
      
      const latestPrescription = await Prescription.findOne({ patientPhoneNumber: patient.phoneNumber })
        .sort({ createdAt: -1 });

      return {
        id: patient.userId || patient.phoneNumber,
        name: patient.name || 'Unknown',
        age: patient.metadata?.age || null,
        gender: patient.metadata?.gender || null,
        history: patient.medicalHistory || [],
        currentCase: latestRecord?.description || 'No recent records',
        allergies: patient.allergies?.map((a) => a.name).join(', ') || 'None reported',
        priority: latestRecord?.priority || 'Routine',
        phoneNumber: patient.phoneNumber
      };
    }));

    res.json({
      success: true,
      patients: patientData
    });
  } catch (error) {
    console.error('❌ Error getting patients:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get patients'
    });
  }
});

/**
 * GET /api/doctors/availability
 * Get availability slots for a doctor
 */
router.get('/availability', async (req, res) => {
  try {
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: 'doctorId is required'
      });
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Get booked appointments
    const appointments = await Appointment.find({ 
      doctorId,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Format availability slots
    const slots = [];
    if (doctor.availability) {
      for (const [day, schedule] of doctor.availability.entries()) {
        if (schedule.available) {
          const [startHour, startMin] = schedule.start.split(':').map(Number);
          const [endHour, endMin] = schedule.end.split(':').map(Number);
          
          const startTime = new Date();
          startTime.setHours(startHour, startMin, 0, 0);
          
          const endTime = new Date();
          endTime.setHours(endHour, endMin, 0, 0);

          slots.push({
            id: `slot-${day}-${schedule.start}`,
            start: startTime.getTime(),
            end: endTime.getTime(),
            note: `Day ${day} availability`
          });
        }
      }
    }

    res.json({
      success: true,
      availability: slots
    });
  } catch (error) {
    console.error('❌ Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get availability'
    });
  }
});

export default router;

