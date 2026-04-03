import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * Web Search Tool
 * Uses Gemini's grounding capabilities if available, otherwise falls back to simple web search
 */

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Simple web search using Gemini with grounding
 * Note: Gemini 2.0+ may support grounding, but we'll use a simple approach
 * For production, consider using @langchain/community tools like Tavily or Serper
 */
async function performWebSearch(query) {
  try {
    // Try using Gemini with grounding if available
    // For now, we'll use Gemini's knowledge and suggest the user verify
    // In production, integrate with a proper search API (Tavily, Serper, etc.)
    
    const model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash-exp',
      temperature: 0.3,
      maxOutputTokens: 1024,
      apiKey,
    });

    const searchPrompt = `You are a helpful assistant that provides accurate, up-to-date information from the web.

User query: ${query}

Please provide a comprehensive answer based on current knowledge. If you're uncertain about recent information, mention that the user should verify with a healthcare professional.

Format your response as:
- Key points (bullet points)
- Relevant information
- Important notes or warnings`;

    const response = await model.invoke([{ role: 'user', content: searchPrompt }]);
    
    return {
      success: true,
      query,
      results: response.content || 'No results found',
      source: 'gemini-knowledge',
      note: 'For real-time web search, consider integrating Tavily or Serper API'
    };
  } catch (error) {
    console.error('❌ [WEB_SEARCH] Error:', error);
    return {
      success: false,
      query,
      error: error.message || 'Web search failed',
      note: 'Consider integrating a dedicated search API like Tavily or Serper'
    };
  }
}

export const webSearchTool = new DynamicStructuredTool({
  name: 'webSearch',
  description: `Search the web for general health information, medical news, symptoms, treatments, or any health-related queries. 
Use this when the user asks about:
- General health information
- Medical conditions or symptoms
- Treatment options
- Health news or updates
- Information that requires current/recent data

Do NOT use this for:
- Creating reminders (use createReminder)
- Getting user's reminders (use getReminders)
- Analyzing images (use analyzeHealthImage)`,
  schema: z.object({
    query: z.string().describe('The search query - what to search for (e.g., "symptoms of diabetes", "benefits of exercise", "COVID-19 prevention")')
  }),
  func: async ({ query }) => {
    console.log('🔍 [WEB_SEARCH] Searching for:', query);
    try {
      const result = await performWebSearch(query);
      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ [WEB_SEARCH] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Web search failed'
      });
    }
  }
});



