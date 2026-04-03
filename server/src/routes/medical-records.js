import { Router } from 'express';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { getOrCreateUser } from '../services/users.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/medical-records
 * Create a new medical record
 */
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      patientPhoneNumber,
      recordType,
      date,
      title,
      description,
      doctorId,
      doctorName,
      attachments,
      metadata
    } = req.body;

    if (!patientPhoneNumber || !recordType || !title) {
      return res.status(400).json({
        success: false,
        error: 'patientPhoneNumber, recordType, and title are required'
      });
    }

    // Get or create user
    let user = null;
    if (patientPhoneNumber) {
      user = await getOrCreateUser(patientPhoneNumber);
    }

    const recordId = `mrec_${uuidv4()}`;
    const recordDate = date || Date.now();

    const record = new MedicalRecord({
      recordId,
      patientId: patientId || user?.userId || 'unknown',
      patientPhoneNumber,
      recordType,
      date: typeof recordDate === 'string' ? new Date(recordDate).getTime() : recordDate,
      title,
      description,
      doctorId,
      doctorName,
      attachments: attachments || [],
      metadata: metadata || {}
    });

    await record.save();

    console.log('✅ Medical record created:', recordId);

    res.json({
      success: true,
      record: {
        recordId: record.recordId,
        patientId: record.patientId,
        recordType: record.recordType,
        title: record.title,
        date: record.date
      }
    });

  } catch (error) {
    console.error('❌ Error creating medical record:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create medical record'
    });
  }
});

/**
 * GET /api/medical-records/:patientId
 * Get all medical records for a patient
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

    const records = await MedicalRecord.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      records: records.map(record => ({
        recordId: record.recordId,
        patientId: record.patientId,
        recordType: record.recordType,
        date: record.date,
        title: record.title,
        description: record.description,
        doctorId: record.doctorId,
        doctorName: record.doctorName,
        attachments: record.attachments
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch medical records'
    });
  }
});

/**
 * GET /api/medical-records/details/:recordId
 * Get specific medical record
 */
router.get('/details/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findOne({ recordId });
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }

    res.json({
      success: true,
      record: {
        recordId: record.recordId,
        patientId: record.patientId,
        patientPhoneNumber: record.patientPhoneNumber,
        recordType: record.recordType,
        date: record.date,
        title: record.title,
        description: record.description,
        doctorId: record.doctorId,
        doctorName: record.doctorName,
        attachments: record.attachments,
        metadata: record.metadata,
        createdAt: record.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching medical record:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch medical record'
    });
  }
});

/**
 * PUT /api/medical-records/:recordId
 * Update medical record
 */
router.put('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { title, description, attachments, metadata } = req.body;

    const record = await MedicalRecord.findOne({ recordId });
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }

    if (title) record.title = title;
    if (description !== undefined) record.description = description;
    if (attachments) record.attachments = attachments;
    if (metadata) record.metadata = { ...record.metadata, ...metadata };

    await record.save();

    console.log('✅ Medical record updated:', recordId);

    res.json({
      success: true,
      record: {
        recordId: record.recordId,
        title: record.title
      }
    });

  } catch (error) {
    console.error('❌ Error updating medical record:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update medical record'
    });
  }
});

export default router;

