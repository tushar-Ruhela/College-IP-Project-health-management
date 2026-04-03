import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCallHistoryByPhoneNumber } from '../call-history.js';

/**
 * Call History Tool
 * Retrieves user's past call summaries for context
 */

export const callHistoryTool = new DynamicStructuredTool({
  name: 'getCallHistory',
  description: `Get the user's past call history and summaries. Use this to remember previous conversations, understand context, or recall what was discussed in past calls.
Use this when:
- The user references a previous conversation
- You need context about past interactions
- The user asks "what did we talk about before?"
- You want to provide continuity across conversations

This helps maintain conversation continuity and provides better personalized assistance.`,
  schema: z.object({
    phoneNumber: z.string().describe('User\'s phone number in E.164 format (e.g., "+1234567890")'),
    limit: z.number().optional().default(5).describe('Number of recent calls to retrieve (default: 5, max: 20)')
  }),
  func: async ({ phoneNumber, limit = 5 }) => {
    console.log('📞 [CALL_HISTORY] Retrieving call history for:', phoneNumber);
    try {
      if (!phoneNumber) {
        return JSON.stringify({
          success: false,
          error: 'phoneNumber is required'
        });
      }

      const maxLimit = Math.min(limit, 20); // Cap at 20
      const calls = await getCallHistoryByPhoneNumber(phoneNumber, maxLimit);

      if (calls.length === 0) {
        return JSON.stringify({
          success: true,
          phoneNumber,
          count: 0,
          calls: [],
          message: 'No call history found for this user'
        });
      }

      // Format call history for LLM context
      const formattedCalls = calls.map(call => ({
        callId: call.callId,
        date: new Date(call.startTime).toISOString(),
        summary: call.summary || call.shortSummary || 'No summary available',
        duration: call.duration || 'Unknown',
        callType: call.callType,
        transcriptLength: call.transcript?.length || 0
      }));

      return JSON.stringify({
        success: true,
        phoneNumber,
        count: formattedCalls.length,
        calls: formattedCalls,
        note: 'Use this information to provide context-aware responses and maintain conversation continuity.'
      });
    } catch (error) {
      console.error('❌ [CALL_HISTORY] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to retrieve call history'
      });
    }
  }
});



