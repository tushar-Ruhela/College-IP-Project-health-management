/**
 * Call History Service
 * Handles saving and retrieving call history from MongoDB
 */

import { getDatabase } from './mongodb';
import { Collection, ObjectId } from 'mongodb';

export interface CallHistory {
  _id?: string | ObjectId;
  callId: string;
  ultravoxCallId: string;
  phoneNumber: string;
  userId?: string;
  callType: 'inbound' | 'outbound' | 'webrtc';
  direction: 'inbound' | 'outbound';
  summary?: string;
  shortSummary?: string;
  transcript: Array<{
    role: 'user' | 'agent' | 'tool_call' | 'tool_result';
    text: string;
    timestamp?: string;
    medium?: 'voice' | 'text';
  }>;
  duration?: string;
  startTime: number;
  endTime?: number;
  metadata?: Record<string, string>;
  createdAt: number;
}

async function getCallHistoryCollection(): Promise<Collection<CallHistory>> {
  const db = await getDatabase();
  return db.collection<CallHistory>('call_history');
}

/**
 * Save call history to MongoDB
 */
export async function saveCallHistory(callHistory: Omit<CallHistory, '_id' | 'createdAt'>): Promise<CallHistory> {
  try {
    const callHistoryCollection = await getCallHistoryCollection();
    
    const historyDoc = {
      ...callHistory,
      createdAt: Date.now()
    };
    
    const result = await callHistoryCollection.insertOne(historyDoc as any);
    const savedHistory: CallHistory = { 
      ...historyDoc, 
      _id: result.insertedId.toString() 
    };
    
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
export async function getCallHistoryByCallId(callId: string): Promise<CallHistory | null> {
  try {
    const callHistoryCollection = await getCallHistoryCollection();
    const history = await callHistoryCollection.findOne({ callId });
    if (!history) return null;
    return {
      ...history,
      _id: history._id instanceof ObjectId ? history._id.toString() : history._id
    };
  } catch (error) {
    console.error('Error fetching call history:', error);
    return null;
  }
}

/**
 * Get call history by phone number
 */
export async function getCallHistoryByPhoneNumber(
  phoneNumber: string,
  limit: number = 50
): Promise<CallHistory[]> {
  try {
    const callHistoryCollection = await getCallHistoryCollection();
    const history = await callHistoryCollection
      .find({ phoneNumber })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
    return history.map(item => ({
      ...item,
      _id: item._id instanceof ObjectId ? item._id.toString() : item._id
    }));
  } catch (error) {
    console.error('Error fetching call history by phone:', error);
    return [];
  }
}

/**
 * Get call history by user ID
 */
export async function getCallHistoryByUserId(
  userId: string,
  limit: number = 50
): Promise<CallHistory[]> {
  try {
    const callHistoryCollection = await getCallHistoryCollection();
    const history = await callHistoryCollection
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
    return history.map(item => ({
      ...item,
      _id: item._id instanceof ObjectId ? item._id.toString() : item._id
    }));
  } catch (error) {
    console.error('Error fetching call history by user:', error);
    return [];
  }
}

/**
 * Get all call history (with pagination)
 */
export async function getAllCallHistory(
  limit: number = 50,
  skip: number = 0
): Promise<CallHistory[]> {
  try {
    const callHistoryCollection = await getCallHistoryCollection();
    const history = await callHistoryCollection
      .find({})
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    return history.map(item => ({
      ...item,
      _id: item._id instanceof ObjectId ? item._id.toString() : item._id
    }));
  } catch (error) {
    console.error('Error fetching all call history:', error);
    return [];
  }
}

