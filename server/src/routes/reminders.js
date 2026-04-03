import { Router } from 'express';
import {
  createReminder,
  getActiveReminders,
  getRemindersForPhone,
  cancelReminder
} from '../services/reminder-scheduler.js';

const router = Router();

/**
 * GET /api/reminders
 * Get all reminders or filter by phone number
 */
router.get('/', async (req, res) => {
  try {
    const phoneNumber = req.query.phoneNumber;

    let reminders;
    if (phoneNumber) {
      reminders = await getRemindersForPhone(phoneNumber);
    } else {
      reminders = await getActiveReminders();
    }

    res.json({
      success: true,
      reminders
    });

  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reminders'
    });
  }
});

/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', async (req, res) => {
  try {
    const { phoneNumber, what, time, frequency = 'once', userId } = req.body;

    if (!phoneNumber || !what || !time) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber, what, and time are required'
      });
    }

    const reminder = await createReminder(phoneNumber, what, time, frequency, userId);

    res.json({
      success: true,
      reminder
    });

  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reminder'
    });
  }
});

/**
 * POST /api/reminders/webhook
 * Webhook endpoint for AI agent to create reminders
 */
router.post('/webhook', async (req, res) => {
  try {
    const { phoneNumber, what, time, frequency = 'once', userId } = req.body;

    if (!phoneNumber || !what || !time) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber, what, and time are required fields'
      });
    }

    if (!phoneNumber.startsWith('+')) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber must be in E.164 format (e.g., +1234567890)'
      });
    }

    console.log('🔔 Webhook: Creating reminder', { phoneNumber, what, time, frequency });

    const reminder = await createReminder(phoneNumber, what, time, frequency, userId);

    res.json({
      success: true,
      message: 'Reminder created successfully',
      reminder: {
        id: reminder.id,
        phoneNumber: reminder.phoneNumber,
        what: reminder.what,
        time: reminder.time,
        frequency: reminder.frequency,
        nextCallTime: reminder.nextCallTime,
        active: reminder.active
      }
    });

  } catch (error) {
    console.error('Error creating reminder via webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create reminder';
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * DELETE /api/reminders
 * Cancel a reminder
 */
router.delete('/', async (req, res) => {
  try {
    const reminderId = req.query.id;

    if (!reminderId) {
      return res.status(400).json({
        success: false,
        error: 'reminder id is required'
      });
    }

    const cancelled = await cancelReminder(reminderId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      message: 'Reminder cancelled'
    });

  } catch (error) {
    console.error('Error cancelling reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel reminder'
    });
  }
});

export default router;

