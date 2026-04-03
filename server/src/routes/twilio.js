import { Router } from 'express';
import { createUltravoxCallForTwilio, makeOutboundCall } from '../services/twilio.js';
import { getOrCreateUser } from '../services/users.js';
import { getInboundCallPrompt, getOutboundPrompt } from '../lib/prompts.js';
import { getCallTools } from '../lib/ultravox-tools.js';
import { saveCallHistory } from '../services/call-history.js';
import { makeReminderCall } from '../services/outbound-call.js';
import twilio from 'twilio';

const router = Router();

/**
 * POST /api/twilio/inbound
 * Handle inbound calls from Twilio
 */
router.post('/inbound', async (req, res) => {
  try {
    console.log('📞 Incoming call received from Twilio');

    const callerNumber = req.body.From || req.body.from || 'Unknown';
    const callSid = req.body.CallSid || req.body.callSid || 'Unknown';
    
    console.log(`Caller: ${callerNumber}, CallSid: ${callSid}`);

    let user;
    try {
      user = await getOrCreateUser(callerNumber);
      console.log('✅ User info retrieved:', { userId: user.userId, name: user.name });
    } catch (error) {
      console.error('Error fetching user info:', error);
      user = { phoneNumber: callerNumber };
    }

    const systemPrompt = getInboundCallPrompt(user);
    const selectedTools = getCallTools(user.phoneNumber, user.userId || 'unknown');

    console.log('🤖 Creating Ultravox call...');
    const ultravoxResponse = await createUltravoxCallForTwilio(systemPrompt, {
      callType: 'inbound_health_assessment',
      callerNumber,
      callSid
    }, selectedTools);

    if (!ultravoxResponse.joinUrl) {
      throw new Error('No joinUrl received from Ultravox API');
    }

    console.log('✅ Got Ultravox joinUrl:', ultravoxResponse.joinUrl);

    const twiml = new twilio.twiml.VoiceResponse();
    const connect = twiml.connect();
    connect.stream({
      url: ultravoxResponse.joinUrl,
      name: 'ultravox'
    });

    console.log('📋 Sending TwiML response to Twilio');
    
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('💥 Error handling incoming call:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was an error connecting your call. Please try again later.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * POST /api/twilio/outbound
 * Make an outbound call to a user
 */
router.post('/outbound', async (req, res) => {
  try {
    const { phoneNumber, message, reminderInfo } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber is required'
      });
    }

    // Use the shared service function
    const result = await makeReminderCall(phoneNumber, reminderInfo, message);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('💥 Error in outbound route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to make outbound call';
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;

