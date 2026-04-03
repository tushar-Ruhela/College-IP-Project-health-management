import { Router } from 'express';
import { Appointment } from '../models/Appointment.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { Prescription } from '../models/Prescription.js';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';
import { getOrCreateUser } from '../services/users.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/ultravox/tools/book-appointment
 * Webhook endpoint for Ultravox to book appointments
 */
router.post('/book-appointment', async (req, res) => {
  try {
    const { patientPhoneNumber, doctorId, date, time, type, reason, patientId } = req.body;

    if (!patientPhoneNumber || !doctorId || !date || !time) {
      return res.json({
        success: false,
        error: 'patientPhoneNumber, doctorId, date, and time are required'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Check if slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date,
      time,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.json({
        success: false,
        error: 'This time slot is already booked'
      });
    }

    // Get or create user
    let user = null;
    if (patientPhoneNumber) {
      user = await getOrCreateUser(patientPhoneNumber);
    }

    const appointmentId = `apt_${uuidv4()}`;
    const appointment = new Appointment({
      appointmentId,
      patientId: patientId || user?.userId || 'unknown',
      patientPhoneNumber,
      doctorId,
      date,
      time,
      type: type || 'consultation',
      reason,
      status: 'scheduled'
    });

    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment booked successfully',
      appointmentId: appointment.appointmentId,
      date: appointment.date,
      time: appointment.time
    });

  } catch (error) {
    console.error('❌ Error in book-appointment webhook:', error);
    res.json({
      success: false,
      error: error.message || 'Failed to book appointment'
    });
  }
});

/**
 * POST /api/ultravox/tools/get-appointments
 * Webhook endpoint for Ultravox to get appointments
 */
router.post('/get-appointments', async (req, res) => {
  try {
    const { patientPhoneNumber, patientId } = req.body;

    if (!patientPhoneNumber) {
      return res.json({
        success: false,
        error: 'patientPhoneNumber is required'
      });
    }

    let query = { patientPhoneNumber };
    if (patientId) {
      query = { $or: [{ patientId }, { patientPhoneNumber }] };
    }

    const appointments = await Appointment.find(query)
      .sort({ date: -1, time: -1 })
      .limit(10);

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        appointmentId: apt.appointmentId,
        doctorId: apt.doctorId,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        type: apt.type
      }))
    });

  } catch (error) {
    console.error('❌ Error in get-appointments webhook:', error);
    res.json({
      success: false,
      error: error.message || 'Failed to get appointments'
    });
  }
});

/**
 * POST /api/ultravox/tools/get-available-slots
 * Webhook endpoint for Ultravox to get available slots
 */
router.post('/get-available-slots', async (req, res) => {
  try {
    const { doctorId, date } = req.body;

    if (!doctorId || !date) {
      return res.json({
        success: false,
        error: 'doctorId and date are required'
      });
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.json({
        success: false,
        error: 'Doctor not found'
      });
    }

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayAvailability = doctor.availability.get(String(dayOfWeek));
    
    if (!dayAvailability || !dayAvailability.available) {
      return res.json({
        success: true,
        available: false,
        slots: []
      });
    }

    const bookedAppointments = await Appointment.find({
      doctorId,
      date,
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('time');

    const bookedTimes = new Set(bookedAppointments.map(apt => apt.time));

    const slots = [];
    const [startHour, startMin] = dayAvailability.start.split(':').map(Number);
    const [endHour, endMin] = dayAvailability.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const timeString = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      
      if (!bookedTimes.has(timeString)) {
        slots.push(timeString);
      }
    }

    res.json({
      success: true,
      available: true,
      slots
    });

  } catch (error) {
    console.error('❌ Error in get-available-slots webhook:', error);
    res.json({
      success: false,
      error: error.message || 'Failed to get available slots'
    });
  }
});

/**
 * POST /api/ultravox/tools/get-patient-profile
 * Webhook endpoint for Ultravox to get patient profile
 */
router.post('/get-patient-profile', async (req, res) => {
  try {
    const { patientPhoneNumber, patientId } = req.body;

    if (!patientPhoneNumber) {
      return res.json({
        success: false,
        error: 'patientPhoneNumber is required'
      });
    }

    let user;
    if (patientId) {
      user = await User.findOne({ userId: patientId });
    }
    if (!user) {
      user = await User.findOne({ phoneNumber: patientPhoneNumber });
    }
    if (!user) {
      user = await getOrCreateUser(patientPhoneNumber);
    }

    res.json({
      success: true,
      patient: {
        userId: user.userId,
        phoneNumber: user.phoneNumber,
        name: user.name,
        allergies: user.allergies || [],
        medicalHistory: user.medicalHistory || []
      }
    });

  } catch (error) {
    console.error('❌ Error in get-patient-profile webhook:', error);
    res.json({
      success: false,
      error: error.message || 'Failed to get patient profile'
    });
  }
});

/**
 * POST /api/ultravox/tools/chat
 * Webhook endpoint for Ultravox to communicate with chat API
 * This allows Ultravox to use the Langchain agent as a tool
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory, phoneNumber } = req.body;

    if (!message) {
      return res.json({
        success: false,
        error: 'message is required'
      });
    }

    // Forward to chat API
    const chatResponse = await fetch(`${process.env.API_BASE_URL || process.env.SERVER_URL || 'http://localhost:3001'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory || [],
        phoneNumber: phoneNumber || null
      })
    });

    const chatData = await chatResponse.json();

    res.json({
      success: chatData.success !== false,
      message: chatData.message,
      toolCalls: chatData.toolCalls
    });

  } catch (error) {
    console.error('❌ Error in chat webhook:', error);
    res.json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
});

export default router;

