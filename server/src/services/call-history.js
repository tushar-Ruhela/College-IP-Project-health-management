import { CallHistory } from '../models/CallHistory.js';

/**
 * Save call history to MongoDB
 */
export async function saveCallHistory(callHistory) {
  try {
    const historyDoc = new CallHistory({
      ...callHistory,
      createdAt: Date.now()
    });
    
    await historyDoc.save();
    const savedHistory = { ...historyDoc.toObject(), _id: historyDoc._id.toString() };
    
    console.log('✅ Call history saved:', savedHistory.callId);
    return savedHistory;
  } catch (error) {
    console.error('Error saving call history:', error);
    throw error;
  }
}

/**
 * Get call history by call ID
 */
export async function getCallHistoryByCallId(callId) {
  try {
    const history = await CallHistory.findOne({ callId }).lean();
    if (!history) return null;
    return { ...history, _id: history._id.toString() };
  } catch (error) {
    console.error('Error fetching call history:', error);
    return null;
  }
}

/**
 * Get call history by phone number
 */
export async function getCallHistoryByPhoneNumber(phoneNumber, limit = 50) {
  try {
    const history = await CallHistory.find({ phoneNumber })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    return history.map(item => ({ ...item, _id: item._id.toString() }));
  } catch (error) {
    console.error('Error fetching call history by phone:', error);
    return [];
  }
}

/**
 * Get call history by user ID
 */
export async function getCallHistoryByUserId(userId, limit = 50) {
  try {
    const history = await CallHistory.find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    return history.map(item => ({ ...item, _id: item._id.toString() }));
  } catch (error) {
    console.error('Error fetching call history by user:', error);
    return [];
  }
}

/**
 * Get all call history (with pagination)
 */
export async function getAllCallHistory(limit = 50, skip = 0) {
  try {
    const history = await CallHistory.find({})
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return history.map(item => ({ ...item, _id: item._id.toString() }));
  } catch (error) {
    console.error('Error fetching all call history:', error);
    return [];
  }
}

