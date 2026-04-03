import { Router } from 'express';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { getLangChainTools } from '../services/langchain-agent.js';
import { getOrCreateUser } from '../services/users.js';
import { getChatAppPrompt } from '../lib/prompts.js';
import { 
  getConversationHistory, 
  formatConversationContext,
  saveConversationMessage 
} from '../services/conversation-memory.js';
import { processChatWithEnhancedAgent } from '../services/enhanced-agent.js';

// import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
// import { processChatWithLangGraph } from '../services/langgraph-agent.js';

const router = Router();

// Lazy initialization of Gemini model (after dotenv loads)
let chatModel = null;

function getChatModel() {
  if (!chatModel) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY must be set in environment variables');
    }

    console.log('🤖 [CHAT] Initializing Gemini model:', modelName);
    chatModel = new ChatGoogleGenerativeAI({
      modelName,
      temperature: 0.7,
      maxOutputTokens: 2048,
      apiKey,
    });
    console.log('✅ [CHAT] Gemini model initialized');
  }
  return chatModel;
}

/**
 * POST /api/chat
 * Handle chat messages with LangChain + Gemini
 * 
 * Request body:
 * {
 *   message: string,
 *   conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
 *   phoneNumber?: string,  // Optional, for user context (primary identifier)
 *   imageUrl?: string,     // Optional, base64 image data or URL for image analysis
 *   location?: string      // Optional, user's location (city, area, or coordinates)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [], phoneNumber, imageUrl, location } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log('💬 [CHAT] Received message:', message.substring(0, 50) + '...');
    console.log('📊 [CHAT] Conversation history length:', conversationHistory.length);

    // Get or create user if phoneNumber provided
    let user = null;
    if (phoneNumber) {
      try {
        user = await getOrCreateUser(phoneNumber);
        console.log('✅ [CHAT] User context loaded:', { userId: user.userId, name: user.name });
      } catch (error) {
        console.warn('⚠️ [CHAT] Could not load user context:', error.message);
      }
    }

    // Load conversation history from MongoDB (if phoneNumber available)
    let conversationContext = '';
    if (phoneNumber) {
      try {
        const pastConversations = await getConversationHistory(phoneNumber, 3, 20);
        conversationContext = formatConversationContext(pastConversations, 15);
        console.log('📚 [CHAT] Loaded conversation history:', pastConversations.length, 'conversation(s)');
      } catch (error) {
        console.warn('⚠️ [CHAT] Could not load conversation history:', error.message);
      }
    }

    // Check if user wants to set language preference
    const languageMatch = message.match(/(?:hindi|हिंदी|english|अंग्रेजी)/i);
    if (languageMatch && user) {
      const preferredLang = /hindi|हिंदी/i.test(languageMatch[0]) ? 'hi' : 'en';
      if (!user.metadata) user.metadata = {};
      if (user.metadata.preferredLanguage !== preferredLang) {
        user.metadata.preferredLanguage = preferredLang;
        await user.save();
        console.log('✅ [CHAT] Language preference updated:', preferredLang);
      }
    }

    // Build system prompt with memory context
    // For app chat: use concise prompt, no language preference asking
    const language = user?.metadata?.preferredLanguage || 'en';
    const basePrompt = getChatAppPrompt(conversationContext, language);
    const userContext = user ? `
**USER CONTEXT:**
- Phone Number: ${user.phoneNumber}
- User ID: ${user.userId || 'Not set'}
${user.name ? `- Name: ${user.name}` : ''}
${user.metadata?.preferredLanguage ? `- Preferred Language: ${user.metadata.preferredLanguage}` : ''}
${user.metadata?.location ? `- Location: ${user.metadata.location}` : ''}
` : '';

    // Add location context if provided
    const locationContext = location ? `
**USER LOCATION:**
- Current Location: ${location}
- When user asks for doctors, clinics, or nearby services, use findDoctorsByLocation tool with this location
` : '';

    const systemPrompt = `${basePrompt}

${userContext}
${locationContext}

**CRITICAL:**
- User is chatting via mobile app (text-based)
- DO NOT ask for language preference - user is already using the app
- Be concise and direct - no unnecessary explanations or fluff
- Get straight to answering their question or helping with their request
- Use tools proactively when needed
${location ? `- User location is available: ${location}. Use this when finding doctors or clinics.` : `- If user asks for doctors/clinics and location is not provided, ask for their location (city/area) or suggest they share location from the app.`}
${user && user.phoneNumber ? `- When creating reminders, use phoneNumber: "${user.phoneNumber}" and userId: "${user.userId || 'unknown'}"` : ''}
${!user?.name ? `- If user's name is not set, ask for it naturally and use updatePatientProfile tool to save it` : ''}`;

    // Use enhanced agent for multi-step reasoning
    console.log('🚀 [CHAT] Using enhanced agent with multi-step reasoning...');
    const result = await processChatWithEnhancedAgent(
      message,
      conversationHistory,
      phoneNumber || user?.phoneNumber,
      req.body.imageUrl || null,
      systemPrompt
    );

    // Save conversation to MongoDB (if phoneNumber available)
    // Note: phoneNumber is the primary identifier, not userId
    if (phoneNumber) {
      try {
        // Save user message
        await saveConversationMessage(
          phoneNumber,
          user?.userId || null, // userId is optional, phoneNumber is primary
          'user',
          message
        );

        // Save assistant response
        await saveConversationMessage(
          phoneNumber,
          user?.userId || null,
          'assistant',
          result.message,
          result.toolCalls || []
        );
        console.log('💾 [CHAT] Conversation saved to MongoDB');
      } catch (error) {
        console.warn('⚠️ [CHAT] Could not save conversation:', error.message);
      }
    }

    console.log('✅ [CHAT] Response generated:', result.message.substring(0, 100) + '...');

    res.json({
      success: result.success !== false,
      message: result.message,
      toolCalls: result.toolCalls || undefined
    });

  } catch (error) {
    console.error('❌ [CHAT] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
});

export default router;

