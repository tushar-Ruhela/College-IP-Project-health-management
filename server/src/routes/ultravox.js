import { Router } from 'express';
import { getCallTranscript, getCallDetails } from '../services/twilio.js';
import { saveCallHistory, getCallHistoryByCallId } from '../services/call-history.js';
import { processTranscriptWithLLM } from '../services/langchain-agent.js';
import { CallHistory } from '../models/CallHistory.js';

const router = Router();

/**
 * POST /api/ultravox/webhook
 * Handle Ultravox webhooks
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, call } = req.body;
    console.log('🔍 Request body:', req.body);

    console.log('📥 Ultravox webhook received:', event);

    // Handle different webhook events
    switch (event) {
      case 'call.started':
        console.log('📞 Call started:', call?.callId);
        // You can add initialization logic here if needed
        break;

      case 'call.joined':
        console.log('👤 Call joined:', call?.callId);
        // You can add join logic here if needed
        break;

      case 'call.ended':
        if (!call?.callId) {
          console.warn('⚠️  call.ended event received but no callId');
          break;
        }
        console.log('📞 Call ended, fetching transcript and summary...');
        
        try {
          const [transcript, callDetails] = await Promise.all([
            getCallTranscript(call.callId),
            getCallDetails(call.callId)
          ]);

          // Try to get phone number from existing call history first (for outbound calls)
          console.log('🔍 [WEBHOOK] Looking up existing call history for:', call.callId);
          const existingCallHistory = await getCallHistoryByCallId(call.callId);
          
          // Extract phone number from multiple possible locations
          // Priority: 1. Existing call history (most reliable), 2. Metadata from webhook/callDetails
          let phoneNumber = existingCallHistory?.phoneNumber || 
            call.metadata?.phoneNumber || 
            call.metadata?.callerNumber || 
            callDetails.metadata?.phoneNumber || 
            callDetails.metadata?.callerNumber ||
            callDetails.experimentalSettings?.metadata?.phoneNumber ||
            callDetails.experimentalSettings?.metadata?.callerNumber ||
            'unknown';
          
          let userId = existingCallHistory?.userId ||
            call.metadata?.userId || 
            callDetails.metadata?.userId ||
            callDetails.experimentalSettings?.metadata?.userId;
          
          // Use existing call history values if available (they're set correctly when call is created)
          // Only extract from metadata if call history doesn't exist or values are missing
          let callType = existingCallHistory?.callType;
          let direction = existingCallHistory?.direction;
          
          // Only extract from metadata if we don't have values from existing history
          if (!callType) {
            const metadataCallType = 
              callDetails.metadata?.callType || 
              callDetails.experimentalSettings?.metadata?.callType;
            
            if (metadataCallType === 'inbound_health_assessment') {
              callType = 'inbound';
            } else if (metadataCallType === 'outbound_health_check') {
              callType = 'outbound';
            } else {
              callType = 'webrtc'; // Default fallback
            }
          }
          
          if (!direction) {
            const metadataCallType = 
              callDetails.metadata?.callType || 
              callDetails.experimentalSettings?.metadata?.callType;
            
            if (metadataCallType === 'inbound_health_assessment') {
              direction = 'inbound';
            } else if (metadataCallType === 'outbound_health_check') {
              direction = 'outbound';
            } else {
              direction = 'inbound'; // Default fallback
            }
          }

          console.log('📋 [WEBHOOK] Extracted metadata:', {
            phoneNumber,
            userId,
            callType,
            direction,
            foundInHistory: !!existingCallHistory,
            hasCallMetadata: !!call.metadata,
            hasCallDetailsMetadata: !!callDetails.metadata,
            hasExperimentalMetadata: !!callDetails.experimentalSettings?.metadata
          });

          // Filter and format transcript - remove messages with empty text
          const formattedTranscript = transcript
            .map((msg) => {
              let role = 'user';
              if (msg.role) {
                const roleStr = String(msg.role).toUpperCase();
                if (roleStr.includes('USER')) role = 'user';
                else if (roleStr.includes('AGENT')) role = 'agent';
                else if (roleStr.includes('TOOL_CALL')) role = 'tool_call';
                else if (roleStr.includes('TOOL_RESULT')) role = 'tool_result';
              }

              const text = msg.text || msg.content || '';
              const timestamp = msg.timespan?.start || msg.timestamp || undefined;

              let medium = 'voice';
              if (msg.medium) {
                const mediumStr = String(msg.medium).toUpperCase();
                if (mediumStr.includes('TEXT')) medium = 'text';
              }

              return {
                role,
                text,
                timestamp,
                medium
              };
            })
            .filter(msg => msg.text && msg.text.trim().length > 0); // Filter out empty messages

          console.log(`📝 [WEBHOOK] Transcript: ${transcript.length} messages, ${formattedTranscript.length} after filtering empty messages`);

          const startTime = callDetails.created ? new Date(callDetails.created).getTime() : Date.now();
          const endTime = callDetails.ended ? new Date(callDetails.ended).getTime() : Date.now();

          try {
            console.log('💾 [WEBHOOK] Saving/updating call history...', {
              callId: call.callId,
              phoneNumber,
              transcriptLength: formattedTranscript.length,
              isUpdate: !!existingCallHistory
            });
            
            // If call history already exists, update it; otherwise create new
            if (existingCallHistory) {
              // Update existing record
              await CallHistory.updateOne(
                { callId: call.callId },
                {
                  $set: {
                    phoneNumber,
                    userId,
                    callType,
                    direction,
                    summary: callDetails.summary,
                    shortSummary: callDetails.shortSummary,
                    transcript: formattedTranscript,
                    duration: callDetails.billedDuration,
                    endTime,
                    metadata: {
                      ...(existingCallHistory.metadata || {}),
                      ...(callDetails.metadata || {}),
                      ...(callDetails.experimentalSettings?.metadata || {})
                    }
                  }
                }
              );
              console.log('✅ Call history updated:', call.callId);
            } else {
              // Create new record
              await saveCallHistory({
                callId: call.callId,
                ultravoxCallId: call.callId,
                phoneNumber,
                userId,
                callType,
                direction,
                summary: callDetails.summary,
                shortSummary: callDetails.shortSummary,
                transcript: formattedTranscript,
                duration: callDetails.billedDuration,
                startTime,
                endTime,
                metadata: callDetails.metadata || callDetails.experimentalSettings?.metadata || {}
              });
              console.log('✅ Call history saved:', call.callId);
            }
          } catch (error) {
            console.error('❌ Error saving call history:', error);
            console.error('📋 [WEBHOOK] Call details:', {
              callId: call.callId,
              phoneNumber,
              transcriptCount: formattedTranscript.length,
              transcriptSample: formattedTranscript.slice(0, 3)
            });
          }
          
          // Process transcript with LLM agent to extract actions and create reminders
          if (phoneNumber && phoneNumber !== 'unknown') {
            console.log('🤖 Processing transcript with LLM agent...');
            try {
              const llmResult = await processTranscriptWithLLM(
                formattedTranscript,
                phoneNumber,
                userId
              );

              if (llmResult.success) {
                console.log(`✅ LLM processing completed. Tool calls: ${llmResult.toolCallsCount}`);
                
                if (llmResult.actions && llmResult.actions.length > 0) {
                  console.log('📋 Actions taken by LLM:');
                  llmResult.actions.forEach((action, index) => {
                    console.log(`   ${index + 1}. ${action.tool}:`, action.result);
                  });
                }

                if (llmResult.summary) {
                  console.log('📝 LLM Summary:', llmResult.summary);
                }
              } else {
                console.error('❌ LLM processing failed:', llmResult.error);
              }
            } catch (error) {
              console.error('❌ Error processing transcript with LLM:', error);
              // Don't throw - we still want to return 204
            }
          } else {
            console.log('⚠️  Skipping LLM processing: phone number not available');
          }
        } catch (error) {
          console.error('Error processing call end:', error);
        }
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event}`);
        break;
    }

    // Return 204 (No Content) as recommended by Ultravox for faster response
    // Always return 2xx to acknowledge receipt, even if processing fails
    // Ultravox will retry on non-2xx responses
    res.status(204).send();

  } catch (error) {
    // Log error but still return 2xx to acknowledge receipt
    // This prevents Ultravox from retrying the same webhook
    console.error('Error processing Ultravox webhook:', error);
    res.status(204).send();
  }
});

export default router;

