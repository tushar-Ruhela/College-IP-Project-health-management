import { createUltravoxCallForTwilio, makeOutboundCall } from './twilio.js';
import { getOrCreateUser } from './users.js';
import { getOutboundPrompt } from '../lib/prompts.js';
import { getCallTools } from '../lib/ultravox-tools.js';
import { saveCallHistory } from './call-history.js';

/**
 * Make an outbound call for a reminder
 * This function can be called directly (by scheduler) or via HTTP (by API route)
 * 
 * @param {string} phoneNumber - User's phone number
 * @param {object} reminderInfo - Reminder information { what, time, frequency }
 * @param {string} message - Optional custom message
 * @returns {Promise<{success: boolean, callSid?: string, ultravoxCallId?: string, error?: string}>}
 */
export async function makeReminderCall(phoneNumber, reminderInfo = null, message = null) {
  try {
    if (!phoneNumber) {
      throw new Error('phoneNumber is required');
    }

    console.log(`📞 [OUTBOUND] Making reminder call to ${phoneNumber}`);

    // Get or create user
    let user;
    try {
      user = await getOrCreateUser(phoneNumber);
      console.log('✅ [OUTBOUND] User info retrieved:', { userId: user.userId, name: user.name });
    } catch (error) {
      console.error('❌ [OUTBOUND] Error fetching user info:', error);
      user = { phoneNumber, userId: 'unknown' };
    }

    // Get system prompt
    const systemPrompt = getOutboundPrompt(user, {
      reminderInfo,
      message
    });

    // Get tools (currently disabled, but kept for future use)
    const selectedTools = getCallTools(user.phoneNumber, user.userId || 'unknown');

    // Create Ultravox call
    console.log('🤖 [OUTBOUND] Creating Ultravox call...');
    const ultravoxResponse = await createUltravoxCallForTwilio(systemPrompt, {
      callType: 'outbound_health_check',
      phoneNumber,
      reminderInfo
    }, selectedTools);

    if (!ultravoxResponse.joinUrl) {
      throw new Error('No joinUrl received from Ultravox API');
    }

    console.log('✅ [OUTBOUND] Got Ultravox joinUrl:', ultravoxResponse.joinUrl);

    // Make Twilio call
    console.log('📱 [OUTBOUND] Initiating Twilio call...');
    const callResult = await makeOutboundCall(phoneNumber, ultravoxResponse.joinUrl);

    console.log('🎉 [OUTBOUND] Call initiated successfully!');
    console.log(`📋 [OUTBOUND] Twilio Call SID: ${callResult.callSid}`);

    // Create preliminary call history entry
    try {
      const startTime = Date.now();
      await saveCallHistory({
        callId: ultravoxResponse.callId,
        ultravoxCallId: ultravoxResponse.callId,
        phoneNumber,
        userId: user.userId,
        callType: 'outbound',
        direction: 'outbound',
        transcript: [],
        startTime,
        metadata: {
          twilioCallSid: callResult.callSid,
          reminderInfo
        }
      });
      console.log('✅ [OUTBOUND] Preliminary call history created');
    } catch (error) {
      console.warn('⚠️  [OUTBOUND] Could not create preliminary call history:', error.message);
    }

    return {
      success: true,
      callSid: callResult.callSid,
      status: callResult.status,
      ultravoxCallId: ultravoxResponse.callId
    };

  } catch (error) {
    console.error('❌ [OUTBOUND] Error making reminder call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to make outbound call';
    return {
      success: false,
      error: errorMessage
    };
  }
}



