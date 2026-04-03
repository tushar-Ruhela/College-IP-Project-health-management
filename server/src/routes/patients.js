import { Router } from 'express';
import { User } from '../models/User.js';
import { getOrCreateUser } from '../services/users.js';

const router = Router();

/**
 * GET /api/patients/:patientId
 * Get patient profile
 */
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { phoneNumber } = req.query;

    let user;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    } else {
      user = await User.findOne({ userId: patientId });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient: {
        userId: user.userId,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        allergies: user.allergies || [],
        medicalHistory: user.medicalHistory || [],
        emergencyContact: user.emergencyContact,
        metadata: user.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error fetching patient:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch patient'
    });
  }
});

/**
 * PUT /api/patients/:patientId
 * Update patient profile
 */
router.put('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { phoneNumber } = req.query;
    const {
      name,
      email,
      dateOfBirth,
      address,
      emergencyContact,
      metadata
    } = req.body;

    let user;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await getOrCreateUser(phoneNumber);
      }
    } else {
      user = await User.findOne({ userId: patientId });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (address) user.address = { ...user.address, ...address };
    if (emergencyContact) user.emergencyContact = { ...user.emergencyContact, ...emergencyContact };
    if (metadata) {
      user.metadata = { ...user.metadata, ...metadata };
    }

    await user.save();

    console.log('✅ Patient profile updated:', user.userId || user.phoneNumber);

    res.json({
      success: true,
      patient: {
        userId: user.userId,
        phoneNumber: user.phoneNumber,
        name: user.name
      }
    });

  } catch (error) {
    console.error('❌ Error updating patient:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update patient'
    });
  }
});

/**
 * POST /api/patients/:patientId/allergies
 * Add allergy to patient
 */
router.post('/:patientId/allergies', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { phoneNumber } = req.query;
    const { name, severity, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Allergy name is required'
      });
    }

    let user;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await getOrCreateUser(phoneNumber);
      }
    } else {
      user = await User.findOne({ userId: patientId });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }
    }

    if (!user.allergies) {
      user.allergies = [];
    }

    // Check if allergy already exists
    const existingIndex = user.allergies.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      // Update existing
      user.allergies[existingIndex] = { name, severity, notes };
    } else {
      // Add new
      user.allergies.push({ name, severity, notes });
    }

    await user.save();

    console.log('✅ Allergy added/updated:', name);

    res.json({
      success: true,
      allergies: user.allergies
    });

  } catch (error) {
    console.error('❌ Error adding allergy:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add allergy'
    });
  }
});

/**
 * POST /api/patients/:patientId/medical-history
 * Add medical history entry
 */
router.post('/:patientId/medical-history', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { phoneNumber } = req.query;
    const { condition, diagnosisDate, status, notes } = req.body;

    if (!condition) {
      return res.status(400).json({
        success: false,
        error: 'Condition is required'
      });
    }

    let user;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await getOrCreateUser(phoneNumber);
      }
    } else {
      user = await User.findOne({ userId: patientId });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }
    }

    if (!user.medicalHistory) {
      user.medicalHistory = [];
    }

    user.medicalHistory.push({
      condition,
      diagnosisDate,
      status: status || 'active',
      notes
    });

    await user.save();

    console.log('✅ Medical history entry added:', condition);

    res.json({
      success: true,
      medicalHistory: user.medicalHistory
    });

  } catch (error) {
    console.error('❌ Error adding medical history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add medical history'
    });
  }
});

export default router;

