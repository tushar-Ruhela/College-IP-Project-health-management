import { Router } from 'express';
import {
  getCallHistoryByPhoneNumber,
  getCallHistoryByUserId,
  getAllCallHistory,
  getCallHistoryByCallId
} from '../services/call-history.js';

const router = Router();

/**
 * GET /api/call-history
 * Get call history with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const phoneNumber = req.query.phoneNumber;
    const userId = req.query.userId;
    const callId = req.query.callId;
    const limit = parseInt(req.query.limit || '50', 10);
    const skip = parseInt(req.query.skip || '0', 10);

    let history;

    if (callId) {
      const call = await getCallHistoryByCallId(callId);
      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      return res.json({
        success: true,
        call: call
      });
    } else if (phoneNumber) {
      history = await getCallHistoryByPhoneNumber(phoneNumber, limit);
    } else if (userId) {
      history = await getCallHistoryByUserId(userId, limit);
    } else {
      history = await getAllCallHistory(limit, skip);
    }

    res.json({
      success: true,
      calls: history,
      count: history.length
    });

  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call history'
    });
  }
});

export default router;

