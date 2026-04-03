import twilio from 'twilio';

/**
 * Twilio client initialization
 */
export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  }

  return twilio(accountSid, authToken);
}

/**
 * Create Ultravox call for Twilio telephony
 */
export async function createUltravoxCallForTwilio(
  systemPrompt: string, 
  metadata?: Record<string, any>,
  selectedTools?: any[]
) {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  if (!apiKey) {
    throw new Error('ULTRAVOX_API_KEY is not set');
  }

  const ultravoxConfig: any = {
    systemPrompt,
    voice: 'Krishna-Hindi-Urdu',
    temperature: 0.7,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    experimentalSettings: {
      metadata: {
        callType: 'health_assessment',
        ...metadata
      }
    },
    medium: { 
      twilio: {} 
    }
  };

  // Add tools if provided
  if (selectedTools && selectedTools.length > 0) {
    ultravoxConfig.selectedTools = selectedTools;
  }

  const response = await fetch('https://api.ultravox.ai/api/calls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(ultravoxConfig)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ultravox API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.joinUrl) {
    throw new Error('No joinUrl received from Ultravox API');
  }

  return data;
}

/**
 * Make outbound call to user
 */
export async function makeOutboundCall(
  toPhoneNumber: string,
  ultravoxJoinUrl: string
): Promise<{ callSid: string; status: string }> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not set');
  }

  const call = await client.calls.create({
    twiml: `<Response><Connect><Stream url="${ultravoxJoinUrl}"/></Connect></Response>`,
    to: toPhoneNumber,
    from: fromNumber
  });

  return {
    callSid: call.sid,
    status: call.status
  };
}

/**
 * Get call transcript from Ultravox
 */
export async function getCallTranscript(callId: string): Promise<any[]> {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  if (!apiKey) {
    throw new Error('ULTRAVOX_API_KEY is not set');
  }

  let allMessages: any[] = [];
  let nextCursor: string | null = null;

  do {
    const url: string = `https://api.ultravox.ai/api/calls/${callId}/messages${nextCursor ? `?cursor=${nextCursor}` : ''}`;
    
    const response: Response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { results?: any[]; next?: string } = await response.json();
    allMessages = allMessages.concat(data.results || []);
    nextCursor = data.next ? new URL(data.next).searchParams.get('cursor') : null;
  } while (nextCursor);

  return allMessages;
}

/**
 * Get call details from Ultravox (including summary)
 */
export async function getCallDetails(callId: string): Promise<{
  callId: string;
  summary?: string;
  shortSummary?: string;
  created?: string;
  joined?: string;
  ended?: string;
  billedDuration?: string;
  metadata?: Record<string, string>;
  [key: string]: any;
}> {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  if (!apiKey) {
    throw new Error('ULTRAVOX_API_KEY is not set');
  }

  const url = `https://api.ultravox.ai/api/calls/${callId}`;
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

