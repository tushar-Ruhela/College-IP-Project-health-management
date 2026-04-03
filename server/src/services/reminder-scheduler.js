import { Reminder } from '../models/Reminder.js';
import mongoose from '../lib/mongodb.js';
import { makeReminderCall } from './outbound-call.js';

let schedulerInterval = null;

// All users are in India, so we always use IST (Indian Standard Time, UTC+5:30)
const USER_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Convert IST time to UTC timestamp
 * All users are Indian, so all times are interpreted as IST (UTC+5:30)
 * @param {string} time - Time string like "7:56 PM"
 * @returns {number} UTC timestamp in milliseconds
 */
function convertISTToUTC(time) {
  const now = new Date();
  
  // Parse time
  let hours = 9;
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
    const match = time.match(/(\d+):?(\d+)?/);
    if (match) {
      hours = parseInt(match[1]);
      minutes = parseInt(match[2] || '0');
    }
  }
  
  // Get today's date
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  
  // User specified time is in IST (e.g., 7:56 PM IST = 19:56 IST)
  // IST is UTC+5:30, so to convert IST to UTC: subtract 5:30
  // Example: 7:56 PM IST (19:56 IST) = 2:26 PM UTC (14:26 UTC)
  
  // Simple conversion: subtract 5 hours 30 minutes from IST time
  let utcHours = hours - 5;
  let utcMinutes = minutes - 30;
  let utcDay = day;
  let utcMonth = month;
  let utcYear = year;
  
  // Handle minute overflow
  if (utcMinutes < 0) {
    utcMinutes += 60;
    utcHours -= 1;
  }
  
  // Handle hour overflow (crossing midnight UTC)
  if (utcHours < 0) {
    utcHours += 24;
    utcDay -= 1;
    if (utcDay < 1) {
      utcMonth -= 1;
      if (utcMonth < 0) {
        utcMonth = 11;
        utcYear -= 1;
      }
      utcDay = new Date(utcYear, utcMonth + 1, 0).getDate();
    }
  }
  
  // Create UTC date object
  const targetUTC = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours, utcMinutes, 0));
  
  // If time has passed today, schedule for tomorrow at the same IST time
  const nowUTC = Date.now();
  if (targetUTC.getTime() <= nowUTC) {
    // Add 24 hours (same IST time tomorrow)
    const tomorrowUTC = new Date(targetUTC.getTime() + (24 * 60 * 60 * 1000));
    return tomorrowUTC.getTime();
  }
  
  return targetUTC.getTime();
}

/**
 * Parse time string to next call timestamp
 * All users are Indian, so times are interpreted as IST and converted to UTC
 */
function parseTimeToTimestamp(time, frequency) {
  // Convert IST time to UTC
  let nextCallTime = convertISTToUTC(time);
  
  // Handle frequency-based scheduling
  if (frequency === 'daily' || frequency === 'twice a day' || frequency === 'weekly' || frequency === 'monthly') {
    // The initial time is already set, frequency handling is done in updateReminderAfterCall
    return nextCallTime;
  }
  
  // For "once", return as is
  return nextCallTime;
}

/**
 * Create a new reminder
 */
export async function createReminder(phoneNumber, what, time, frequency = 'once', userId) {
  const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // All users are Indian, so interpret time as IST and convert to UTC
  let nextCallTime = parseTimeToTimestamp(time, frequency);

  // Safety check: ensure nextCallTime is valid (not 0 or in the past)
  if (!nextCallTime || nextCallTime <= Date.now()) {
    console.warn(`⚠️  [REMINDER] Invalid nextCallTime (${nextCallTime}), scheduling for tomorrow at same time`);
    // Schedule for tomorrow at the same time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeMatch = time.match(/(\d+):?(\d+)?\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      if (timeMatch[3]) {
        if (timeMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      tomorrow.setHours(hours, minutes, 0, 0);
      nextCallTime = tomorrow.getTime();
    } else {
      // Default to 9 AM tomorrow if we can't parse
      tomorrow.setHours(9, 0, 0, 0);
      nextCallTime = tomorrow.getTime();
    }
  }

  let reminderType = 'other';
  const whatLower = what.toLowerCase();
  if (whatLower.includes('medicine') || whatLower.includes('medication')) {
    reminderType = 'medication';
  } else if (whatLower.includes('appointment')) {
    reminderType = 'appointment';
  } else if (whatLower.includes('exercise')) {
    reminderType = 'exercise';
  }

  const reminder = new Reminder({
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
      reminderType
    }
  });

  await reminder.save();
  const savedReminder = { ...reminder.toObject(), _id: reminder._id.toString() };

  const nextCallDate = new Date(savedReminder.nextCallTime);
  console.log('✅ [REMINDER] Reminder created successfully:');
  console.log(`   📱 Phone: ${savedReminder.phoneNumber}`);
  console.log(`   📝 What: "${savedReminder.what}"`);
  console.log(`   ⏰ Time: ${savedReminder.time}`);
  console.log(`   🔄 Frequency: ${savedReminder.frequency}`);
  console.log(`   📅 Next call (UTC): ${nextCallDate.toISOString()}`);
  console.log(`   📅 Next call (local): ${nextCallDate.toLocaleString()}`);
  console.log(`   ⚠️  Note: Time is stored in UTC. User timezone support needed for accurate scheduling.`);
  console.log(`   🆔 ID: ${savedReminder.id}`);

  // Start scheduler if not running
  startScheduler();

  return savedReminder;
}

/**
 * Get all active reminders
 */
export async function getActiveReminders() {
  const reminders = await Reminder.find({ active: true }).lean();
  return reminders.map(r => ({ ...r, _id: r._id.toString() }));
}

/**
 * Get reminders for a specific phone number
 */
export async function getRemindersForPhone(phoneNumber) {
  const reminders = await Reminder.find({ 
    active: true, 
    phoneNumber 
  }).lean();
  return reminders.map(r => ({ ...r, _id: r._id.toString() }));
}

/**
 * Get reminder by ID
 */
export async function getReminderById(reminderId) {
  const reminder = await Reminder.findOne({ id: reminderId }).lean();
  return reminder ? { ...reminder, _id: reminder._id.toString() } : null;
}

/**
 * Cancel a reminder
 */
export async function cancelReminder(reminderId) {
  const result = await Reminder.updateOne(
    { id: reminderId },
    { $set: { active: false } }
  );
  return result.modifiedCount > 0;
}

/**
 * Update reminder after call
 */
export async function updateReminderAfterCall(reminderId) {
  const reminder = await Reminder.findOne({ id: reminderId });
  
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

  await Reminder.updateOne(
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

  const nextCallDate = new Date(nextCallTime);
  console.log(`✅ [REMINDER] Reminder updated: ${reminderId}`);
  console.log(`   📞 Call count: ${callCount}`);
  console.log(`   📅 Next call: ${nextCallDate.toLocaleString()}`);
  console.log(`   🔄 Active: ${active}`);
}

/**
 * Get reminders that are due to be called
 */
export async function getDueReminders() {
  // Check if MongoDB is connected before querying
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  [SCHEDULER] MongoDB not connected, skipping reminder check');
    return [];
  }

  try {
    const now = Date.now();
    const nowDate = new Date(now);
    // Log in UTC to avoid confusion
    const nowUTC = nowDate.toISOString();
    console.log(`🔍 [SCHEDULER] Checking for due reminders at ${nowUTC} (UTC)`);
    console.log(`   Local server time: ${nowDate.toLocaleString()}`);
    
    // First, get count of all active reminders
    const totalActive = await Reminder.countDocuments({ active: true });
    console.log(`📊 [SCHEDULER] Total active reminders in database: ${totalActive}`);
    
    // Get due reminders
    const reminders = await Reminder.find({
      active: true,
      nextCallTime: { $lte: now, $gt: 0 }
    }).lean();
    
    const mappedReminders = reminders.map(r => ({ ...r, _id: r._id.toString() }));
    
    if (mappedReminders.length > 0) {
      console.log(`✅ [SCHEDULER] Found ${mappedReminders.length} due reminder(s):`);
      mappedReminders.forEach((reminder, index) => {
        const nextCallDate = new Date(reminder.nextCallTime);
        console.log(`   ${index + 1}. "${reminder.what}" for ${reminder.phoneNumber}`);
        console.log(`      Time: ${reminder.time} | Frequency: ${reminder.frequency}`);
        console.log(`      Next call scheduled for: ${nextCallDate.toISOString()} (UTC)`);
        console.log(`      Local time: ${nextCallDate.toLocaleString()}`);
        console.log(`      ID: ${reminder.id}`);
      });
    } else {
      console.log(`ℹ️  [SCHEDULER] No reminders due at this time`);
    }
    
    return mappedReminders;
  } catch (error) {
    console.error('❌ [SCHEDULER] Error fetching due reminders:', error.message);
    return []; // Return empty array on error to prevent scheduler crash
  }
}

/**
 * Get upcoming reminders in the next hour
 */
export async function getUpcomingRemindersInNextHour() {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  try {
    const now = Date.now();
    const oneHourFromNow = now + (60 * 60 * 1000); // 1 hour in milliseconds
    
    const upcomingReminders = await Reminder.find({
      active: true,
      nextCallTime: { $gt: now, $lte: oneHourFromNow }
    })
    .sort({ nextCallTime: 1 })
    .lean();
    
    return upcomingReminders.map(r => ({ ...r, _id: r._id.toString() }));
  } catch (error) {
    console.error('❌ [SCHEDULER] Error fetching upcoming reminders:', error.message);
    return [];
  }
}

/**
 * Start the reminder scheduler
 * Checks every minute for due reminders and makes calls
 */
export function startScheduler() {
  if (schedulerInterval) {
    console.log('⚠️  [SCHEDULER] Scheduler already running, skipping start');
    return; // Already running
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('⏰ [SCHEDULER] Starting reminder scheduler...');
  console.log('   📅 Check interval: Every 30 seconds');
  console.log('   🔄 Status: Active and monitoring for due reminders');
  console.log('═══════════════════════════════════════════════════════\n');
  
  schedulerInterval = setInterval(async () => {
    const checkTime = new Date();
    const timeStr = checkTime.toLocaleString();
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log(`║ ⏰ [SCHEDULER] Running check at ${timeStr.padEnd(25)} ║`);
    console.log('╚═══════════════════════════════════════════════════════╝');
    
    try {
      // Check MongoDB connection before proceeding
      if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️  [SCHEDULER] MongoDB not connected (readyState: ' + mongoose.connection.readyState + '), skipping check');
        return;
      }
      
      console.log('✅ [SCHEDULER] MongoDB connection verified\n');

      // Get due reminders
      const dueReminders = await getDueReminders();
      
      // Get upcoming reminders in next hour
      const upcomingReminders = await getUpcomingRemindersInNextHour();
      
      // Display upcoming reminders
      if (upcomingReminders.length > 0) {
        console.log(`\n📅 [SCHEDULER] Upcoming reminders in the next 1 hour (${upcomingReminders.length}):`);
        upcomingReminders.forEach((reminder, index) => {
          const nextCallDate = new Date(reminder.nextCallTime);
          const timeUntil = Math.round((reminder.nextCallTime - Date.now()) / 1000 / 60); // minutes
          console.log(`   ${index + 1}. "${reminder.what}"`);
          console.log(`      📱 Phone: ${reminder.phoneNumber}`);
          console.log(`      ⏰ Scheduled: ${nextCallDate.toLocaleString()}`);
          console.log(`      ⏳ In: ${timeUntil} minute(s)`);
          console.log(`      🔄 Frequency: ${reminder.frequency}`);
        });
      } else {
        console.log(`\n📅 [SCHEDULER] No reminders scheduled in the next 1 hour`);
      }
      
      if (dueReminders.length > 0) {
        console.log(`\n🔔 [SCHEDULER] Processing ${dueReminders.length} due reminder(s)...`);
        
        for (let i = 0; i < dueReminders.length; i++) {
          const reminder = dueReminders[i];
          console.log(`\n📞 [SCHEDULER] Processing reminder ${i + 1}/${dueReminders.length}:`);
          console.log(`   Reminder: "${reminder.what}"`);
          console.log(`   Phone: ${reminder.phoneNumber}`);
          console.log(`   Frequency: ${reminder.frequency}`);
          
          try {
            // Make the outbound call directly (no HTTP call needed since we're in the same process)
            console.log(`   📞 Making reminder call directly...`);
            
            const result = await makeReminderCall(
              reminder.phoneNumber,
              {
                what: reminder.what,
                time: reminder.time,
                frequency: reminder.frequency
              }
            );

            if (result.success) {
              console.log(`   ✅ Call initiated successfully!`);
              console.log(`   📋 Twilio Call SID: ${result.callSid}`);
              console.log(`   🆔 Ultravox Call ID: ${result.ultravoxCallId || 'N/A'}`);
              
              // Update reminder (only if MongoDB is still connected)
              if (mongoose.connection.readyState === 1) {
                console.log(`   🔄 Updating reminder in database...`);
                await updateReminderAfterCall(reminder.id);
                console.log(`   ✅ Reminder updated successfully`);
              } else {
                console.warn('   ⚠️  MongoDB disconnected, skipping reminder update');
              }
            } else {
              console.error(`   ❌ Failed to make reminder call`);
              console.error(`   Error: ${result.error}`);
            }
          } catch (error) {
            console.error(`   ❌ Error making reminder call:`, error.message);
            if (error.stack) {
              console.error(`   Stack: ${error.stack.split('\n')[0]}`);
            }
          }
        }
        
        console.log(`\n✅ [SCHEDULER] Finished processing ${dueReminders.length} reminder(s)`);
      } else {
        console.log(`\nℹ️  [SCHEDULER] No reminders to process at this time`);
      }
      
      console.log('\n───────────────────────────────────────────────────────');
      console.log(`⏰ [SCHEDULER] Next check in 30 seconds\n`);
    } catch (error) {
      console.error('❌ [SCHEDULER] Error in scheduler:', error.message || error);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
      }
      console.log('───────────────────────────────────────────────────────\n');
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏰ [SCHEDULER] Reminder scheduler stopped');
  } else {
    console.log('ℹ️  [SCHEDULER] Scheduler was not running');
  }
}

