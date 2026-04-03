/**
 * Reminder Scheduler Service
 * Handles scheduling and executing reminder calls using MongoDB
 */

import { getRemindersCollection } from './mongodb';
import { ObjectId } from 'mongodb';

export interface Reminder {
  _id?: ObjectId;
  id: string;
  userId?: string;
  phoneNumber: string;
  what: string;
  time: string; // Time of day (e.g., "9:00 AM", "after dinner")
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'twice a day' | string;
  nextCallTime: number; // Unix timestamp
  createdAt: number;
  lastCalled?: number;
  callCount: number;
  active: boolean;
  metadata?: {
    callId?: string;
    reminderType?: 'medication' | 'appointment' | 'exercise' | 'other';
  };
}

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Parse time string to next call timestamp
 */
function parseTimeToTimestamp(time: string, frequency: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Parse time (e.g., "9:00 AM", "14:30", "after dinner" = 7 PM)
  let hours = 9; // default 9 AM
  let minutes = 0;

  if (time.includes('AM') || time.includes('PM')) {
    const match = time.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
    if (match) {
      hours = parseInt(match[1]);
      minutes = parseInt(match[2] || '0');
      if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
  } else if (time.includes('after dinner')) {
    hours = 19; // 7 PM
  } else if (time.includes('morning')) {
    hours = 9;
  } else if (time.includes('evening')) {
    hours = 18;
  } else if (time.includes('night')) {
    hours = 21;
  } else {
    // Try to parse as 24-hour format
    const match = time.match(/(\d+):?(\d+)?/);
    if (match) {
      hours = parseInt(match[1]);
      minutes = parseInt(match[2] || '0');
    }
  }

  const targetTime = new Date(today);
  targetTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow (or next occurrence)
  if (targetTime <= now) {
    if (frequency === 'daily' || frequency === 'twice a day') {
      targetTime.setDate(targetTime.getDate() + 1);
    } else if (frequency === 'weekly') {
      targetTime.setDate(targetTime.getDate() + 7);
    } else if (frequency === 'monthly') {
      targetTime.setMonth(targetTime.getMonth() + 1);
    } else {
      // For "once", if time passed, don't schedule
      return 0;
    }
  }

  return targetTime.getTime();
}

/**
 * Create a new reminder
 */
export async function createReminder(
  phoneNumber: string,
  what: string,
  time: string,
  frequency: string = 'once',
  userId?: string
): Promise<Reminder> {
  const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const nextCallTime = parseTimeToTimestamp(time, frequency);

  const reminder: Reminder = {
    id,
    userId,
    phoneNumber,
    what,
    time,
    frequency,
    nextCallTime,
    createdAt: Date.now(),
    callCount: 0,
    active: true,
    metadata: {
      reminderType: what.toLowerCase().includes('medicine') || what.toLowerCase().includes('medication') 
        ? 'medication' 
        : what.toLowerCase().includes('appointment')
        ? 'appointment'
        : what.toLowerCase().includes('exercise')
        ? 'exercise'
        : 'other'
    }
  };

  const collection = await getRemindersCollection();
  const result = await collection.insertOne(reminder);
  reminder._id = result.insertedId;

  console.log('✅ Reminder created:', reminder);

  // Start scheduler if not running
  startScheduler();

  return reminder;
}

/**
 * Get all active reminders
 */
export async function getActiveReminders(): Promise<Reminder[]> {
  const collection = await getRemindersCollection();
  const reminders = await collection.find({ active: true }).toArray();
  return reminders as Reminder[];
}

/**
 * Get reminders for a specific phone number
 */
export async function getRemindersForPhone(phoneNumber: string): Promise<Reminder[]> {
  const collection = await getRemindersCollection();
  const reminders = await collection.find({ 
    active: true, 
    phoneNumber 
  }).toArray();
  return reminders as Reminder[];
}

/**
 * Get reminder by ID
 */
export async function getReminderById(reminderId: string): Promise<Reminder | null> {
  const collection = await getRemindersCollection();
  const reminder = await collection.findOne({ id: reminderId });
  return reminder as Reminder | null;
}

/**
 * Cancel a reminder
 */
export async function cancelReminder(reminderId: string): Promise<boolean> {
  const collection = await getRemindersCollection();
  const result = await collection.updateOne(
    { id: reminderId },
    { $set: { active: false } }
  );
  return result.modifiedCount > 0;
}

/**
 * Update reminder after call
 */
export async function updateReminderAfterCall(reminderId: string): Promise<void> {
  const collection = await getRemindersCollection();
  const reminder = await collection.findOne({ id: reminderId });
  
  if (!reminder) return;

  const lastCalled = Date.now();
  const callCount = (reminder.callCount || 0) + 1;
  let nextCallTime = reminder.nextCallTime;
  let active = reminder.active;

  // Calculate next call time based on frequency
  if (reminder.frequency === 'once') {
    active = false; // One-time reminder, deactivate
  } else if (reminder.frequency === 'daily') {
    nextCallTime = nextCallTime + (24 * 60 * 60 * 1000);
  } else if (reminder.frequency === 'twice a day') {
    // Schedule next call 12 hours later
    nextCallTime = nextCallTime + (12 * 60 * 60 * 1000);
  } else if (reminder.frequency === 'weekly') {
    nextCallTime = nextCallTime + (7 * 24 * 60 * 60 * 1000);
  } else if (reminder.frequency === 'monthly') {
    const nextDate = new Date(nextCallTime);
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextCallTime = nextDate.getTime();
  }

  await collection.updateOne(
    { id: reminderId },
    { 
      $set: { 
        lastCalled,
        callCount,
        nextCallTime,
        active
      } 
    }
  );

  console.log('✅ Reminder updated:', reminderId);
}

/**
 * Get reminders that are due to be called
 */
export async function getDueReminders(): Promise<Reminder[]> {
  const now = Date.now();
  const collection = await getRemindersCollection();
  const reminders = await collection.find({
    active: true,
    nextCallTime: { $lte: now, $gt: 0 }
  }).toArray();
  return reminders as Reminder[];
}

/**
 * Start the reminder scheduler
 * Checks every minute for due reminders and makes calls
 */
export function startScheduler(): void {
  if (schedulerInterval) {
    return; // Already running
  }

  console.log('⏰ Starting reminder scheduler...');
  
  schedulerInterval = setInterval(async () => {
    try {
      const dueReminders = await getDueReminders();
      
      if (dueReminders.length > 0) {
        console.log(`🔔 Found ${dueReminders.length} due reminder(s)`);
        
        for (const reminder of dueReminders) {
          try {
            // Make the outbound call
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://m-app-livid.vercel.app';
            const response = await fetch(`${baseUrl}/api/twilio/outbound`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phoneNumber: reminder.phoneNumber,
                reminderInfo: {
                  what: reminder.what,
                  time: reminder.time,
                  frequency: reminder.frequency
                }
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Reminder call made for ${reminder.phoneNumber}:`, result.callSid);
              
              // Update reminder
              await updateReminderAfterCall(reminder.id);
            } else {
              console.error(`❌ Failed to make reminder call for ${reminder.phoneNumber}`);
            }
          } catch (error) {
            console.error(`❌ Error making reminder call:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in scheduler:', error);
    }
  }, 60000); // Check every minute
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏰ Reminder scheduler stopped');
  }
}

// Auto-start scheduler when module loads
if (typeof window === 'undefined') {
  // Only run on server
  startScheduler();
}
