import { Router } from 'express';
import { Prescription } from '../models/Prescription.js';
import { getOrCreateUser } from '../services/users.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/prescriptions
 * Create a new prescription
 */
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      patientPhoneNumber,
      doctorId,
      doctorName,
      appointmentId,
      medications,
      instructions,
      followUpDate
    } = req.body;

    if (!patientPhoneNumber || !doctorId || !medications || medications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'patientPhoneNumber, doctorId, and medications are required'
      });
    }

    // Get or create user
    let user = null;
    if (patientPhoneNumber) {
      user = await getOrCreateUser(patientPhoneNumber);
    }

    const prescriptionId = `presc_${uuidv4()}`;

    const prescription = new Prescription({
      prescriptionId,
      patientId: patientId || user?.userId || 'unknown',
      patientPhoneNumber,
      doctorId,
      doctorName,
      appointmentId,
      medications,
      instructions,
      followUpDate: followUpDate ? (typeof followUpDate === 'string' ? new Date(followUpDate).getTime() : followUpDate) : null,
      status: 'active'
    });

    await prescription.save();

    console.log('✅ Prescription created:', prescriptionId);

    res.json({
      success: true,
      prescription: {
        prescriptionId: prescription.prescriptionId,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        medications: prescription.medications,
        date: prescription.date
      }
    });

  } catch (error) {
    console.error('❌ Error creating prescription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create prescription'
    });
  }
});

/**
 * GET /api/prescriptions/:patientId
 * Get all prescriptions for a patient
 */
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { phoneNumber, limit = 50 } = req.query;

    let query = {};
    if (phoneNumber) {
      query = { patientPhoneNumber: phoneNumber };
    } else {
      query = { patientId };
    }

    const prescriptions = await Prescription.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      prescriptions: prescriptions.map(presc => ({
        prescriptionId: presc.prescriptionId,
        patientId: presc.patientId,
        doctorId: presc.doctorId,
        doctorName: presc.doctorName,
        appointmentId: presc.appointmentId,
        medications: presc.medications,
        instructions: presc.instructions,
        date: presc.date,
        followUpDate: presc.followUpDate,
        status: presc.status
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch prescriptions'
    });
  }
});

/**
 * GET /api/prescriptions/details/:prescriptionId
 * Get specific prescription
 */
router.get('/details/:prescriptionId', async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findOne({ prescriptionId });
    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      prescription: {
        prescriptionId: prescription.prescriptionId,
        patientId: prescription.patientId,
        patientPhoneNumber: prescription.patientPhoneNumber,
        doctorId: prescription.doctorId,
        doctorName: prescription.doctorName,
        appointmentId: prescription.appointmentId,
        medications: prescription.medications,
        instructions: prescription.instructions,
        date: prescription.date,
        followUpDate: prescription.followUpDate,
        status: prescription.status,
        createdAt: prescription.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch prescription'
    });
  }
});

export default router;

