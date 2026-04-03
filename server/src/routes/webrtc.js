import { Router } from 'express';
import { getWebRTCCallPrompt } from '../lib/prompts.js';

const router = Router();

/**
 * POST /api/create-ai-call
 * Create a WebRTC call for in-app video/voice calls
 */
router.post('/create-ai-call', async (req, res) => {
  try {
    if (!process.env.ULTRAVOX_API_KEY) {
      console.error('ULTRAVOX_API_KEY is not set in environment variables');
      return res.status(500).json({
        success: false,
        error: 'ULTRAVOX_API_KEY not configured. Please add ULTRAVOX_API_KEY to your .env file.'
      });
    }

    const systemPrompt = getWebRTCCallPrompt();

    const ultravoxConfig = {
      systemPrompt,
      voice: 'Krishna-Hindi-Urdu',
      temperature: 0.7,
      firstSpeaker: 'FIRST_SPEAKER_AGENT',
      experimentalSettings: {
        metadata: {
          callType: 'health_assessment'
        }
      },
      medium: { 
        webRtc: {} 
      }
    };

    console.log('Creating Ultravox call with config:', JSON.stringify(ultravoxConfig, null, 2));

    const response = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ULTRAVOX_API_KEY
      },
      body: JSON.stringify(ultravoxConfig)
    });

    console.log('Ultravox API response status:', response.status);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('Ultravox API error response:', errorText);
      } catch {
        console.error('Failed to read error response');
      }
      
      return res.status(500).json({
        success: false,
        error: `Ultravox API error (${response.status}): ${errorText || 'Unknown error'}`
      });
    }

    let data;
    try {
      const responseText = await response.text();
      console.log('Ultravox API success response:', responseText);
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Ultravox response:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Invalid response from Ultravox API'
      });
    }
    
    if (!data.joinUrl) {
      console.error('No joinUrl in response:', data);
      return res.status(500).json({
        success: false,
        error: data.detail || data.message || 'Failed to create call - no joinUrl in response'
      });
    }

    console.log('Call created successfully, joinUrl:', data.joinUrl);
    res.json({ success: true, data });

  } catch (error) {
    console.error('Create AI call error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to create call. Please check server logs for details.';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;

