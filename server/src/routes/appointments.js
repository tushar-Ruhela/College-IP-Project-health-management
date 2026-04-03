import { Router } from 'express';
import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';
import { getOrCreateUser } from '../services/users.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/', async (req, res) => {
  try {
    const { patientId, patientPhoneNumber, doctorId, date, time, type, reason, notes } = req.body;

    if (!patientPhoneNumber || !doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'patientPhoneNumber, doctorId, date, and time are required'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
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
      return res.status(409).json({
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
      notes,
      status: 'scheduled'
    });

    await appointment.save();

    console.log('✅ Appointment created:', appointmentId);

    res.json({
      success: true,
      appointment: {
        appointmentId: appointment.appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        type: appointment.type
      }
    });

  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create appointment'
    });
  }
});

/**
 * GET /api/appointments/:patientId
 * Get all appointments for a patient
 */
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { phoneNumber } = req.query;

    let query = {};
    if (phoneNumber) {
      query = { patientPhoneNumber: phoneNumber };
    } else {
      query = { patientId };
    }

    const appointments = await Appointment.find(query)
      .sort({ date: -1, time: -1 })
      .limit(50);

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        appointmentId: apt.appointmentId,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        type: apt.type,
        reason: apt.reason,
        notes: apt.notes
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch appointments'
    });
  }
});

/**
 * GET /api/appointments/details/:appointmentId
 * Get appointment details
 */
router.get('/details/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Get doctor details
    const doctor = await Doctor.findOne({ doctorId: appointment.doctorId });

    res.json({
      success: true,
      appointment: {
        appointmentId: appointment.appointmentId,
        patientId: appointment.patientId,
        patientPhoneNumber: appointment.patientPhoneNumber,
        doctorId: appointment.doctorId,
        doctor: doctor ? {
          name: doctor.name,
          specialization: doctor.specialization
        } : null,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes,
        createdAt: appointment.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch appointment'
    });
  }
});

/**
 * PUT /api/appointments/:appointmentId
 * Update or cancel appointment
 */
router.put('/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, date, time, notes, reason } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // If updating date/time, check availability
    if (date || time) {
      const newDate = date || appointment.date;
      const newTime = time || appointment.time;

      if (newDate !== appointment.date || newTime !== appointment.time) {
        const existingAppointment = await Appointment.findOne({
          doctorId: appointment.doctorId,
          date: newDate,
          time: newTime,
          appointmentId: { $ne: appointmentId },
          status: { $in: ['scheduled', 'confirmed'] }
        });

        if (existingAppointment) {
          return res.status(409).json({
            success: false,
            error: 'This time slot is already booked'
          });
        }
      }
    }

    // Update fields
    if (status) appointment.status = status;
    if (date) appointment.date = date;
    if (time) appointment.time = time;
    if (notes !== undefined) appointment.notes = notes;
    if (reason !== undefined) appointment.reason = reason;

    await appointment.save();

    console.log('✅ Appointment updated:', appointmentId);

    res.json({
      success: true,
      appointment: {
        appointmentId: appointment.appointmentId,
        status: appointment.status,
        date: appointment.date,
        time: appointment.time
      }
    });

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update appointment'
    });
  }
});

/**
 * GET /api/appointments/slots/:doctorId/:date
 * Get available slots for a doctor on a specific date
 */
router.get('/slots/:doctorId/:date', async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Get doctor's availability for this day
    const dayAvailability = doctor.availability.get(String(dayOfWeek));
    
    if (!dayAvailability || !dayAvailability.available) {
      return res.json({
        success: true,
        available: false,
        message: 'Doctor is not available on this day',
        slots: []
      });
    }

    // Get booked appointments for this date
    const bookedAppointments = await Appointment.find({
      doctorId,
      date,
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('time');

    const bookedTimes = new Set(bookedAppointments.map(apt => apt.time));

    // Generate time slots (30-minute intervals)
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
      slots,
      doctor: {
        name: doctor.name,
        specialization: doctor.specialization
      }
    });

  } catch (error) {
    console.error('❌ Error fetching slots:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch available slots'
    });
  }
});

export default router;

