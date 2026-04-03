import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { getLangChainTools } from './langchain-agent.js';


const MAX_ITERATIONS = 10;

/**
 * Check if message is a simple acknowledgment that doesn't need tools
 */
function isSimpleMessage(message) {
  const simplePatterns = [
    /^(ok|okay|k|yes|yep|yeah|sure|alright|fine|got it|thanks|thank you|thx|no|nope|nah)$/i,
    /^(ok|okay|k|yes|yep|yeah|sure|alright|fine|got it|thanks|thank you|thx|no|nope|nah)[\s.,!?]*$/i,
  ];
  
  const trimmed = message.trim();
  return simplePatterns.some(pattern => pattern.test(trimmed)) && trimmed.length < 20;
}

/**
 * Process a chat message with enhanced multi-step reasoning
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages
 * @param {string} phoneNumber - User's phone number (primary identifier)
 * @param {string} imageUrl - Optional image URL or base64 data
 * @param {string} systemPrompt - System prompt
 * @returns {Promise<Object>} Response with message and tool calls
 */
export async function processChatWithEnhancedAgent(
  message,
  conversationHistory = [],
  phoneNumber,
  imageUrl = null,
  systemPrompt
) {
  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY must be set');
    }

    // Fast path for simple acknowledgments - no tools needed
    if (isSimpleMessage(message) && !imageUrl) {
      console.log('⚡ [ENHANCED_AGENT] Simple message detected, using fast path');
      
      // Use a very quick, simple response without calling the model
      // This saves time and API calls for simple acknowledgments
      const quickResponses = {
        'ok': 'Got it! How else can I help?',
        'okay': 'Got it! How else can I help?',
        'k': 'Got it! How else can I help?',
        'yes': 'Great! What would you like to do?',
        'yep': 'Great! What would you like to do?',
        'yeah': 'Great! What would you like to do?',
        'sure': 'Perfect! How can I assist you?',
        'alright': 'Perfect! How can I assist you?',
        'fine': 'Good! What can I help with?',
        'got it': 'Great! Anything else?',
        'thanks': 'You\'re welcome! Anything else I can help with?',
        'thank you': 'You\'re welcome! Anything else I can help with?',
        'thx': 'You\'re welcome! Anything else I can help with?',
        'no': 'No problem! What else can I help with?',
        'nope': 'No problem! What else can I help with?',
        'nah': 'No problem! What else can I help with?'
      };

      const normalized = message.trim().toLowerCase().replace(/[.,!?]/g, '');
      const quickResponse = quickResponses[normalized] || 'Got it! How else can I help?';
      
      return {
        success: true,
        message: quickResponse,
        toolCalls: undefined,
        iterations: 0
      };
    }

    const model = new ChatGoogleGenerativeAI({
      modelName,
      temperature: 0.7,
      maxOutputTokens: 2048,
      apiKey,
    });

    // Smart tool loading: use minimal tools for simple messages, full tools when needed
    const tools = getLangChainTools(false, message);
    const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;

    // Build message history
    const messages = [];
    messages.push(new SystemMessage(systemPrompt));

    // Add conversation history (limit to last 15 messages to leave room for tool calls)
    const recentHistory = conversationHistory.slice(-15);
    recentHistory.forEach(msg => {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new AIMessage(msg.content));
      }
    });

    // Add current user message (with image if provided)
    if (imageUrl) {
      // If image is provided, create a multimodal message
      messages.push(new HumanMessage({
        content: [
          { type: 'text', text: message || 'Please analyze this image.' },
          { 
            type: 'image_url', 
            image_url: imageUrl.startsWith('data:') ? imageUrl : `data:image/jpeg;base64,${imageUrl}`
          }
        ]
      }));
    } else {
      messages.push(new HumanMessage(message));
    }

    let iteration = 0;
    let finalResponse = null;
    const allToolResults = [];

    // Multi-step reasoning loop
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`🔄 [ENHANCED_AGENT] Iteration ${iteration}/${MAX_ITERATIONS}`);

      // Invoke model
      const response = await modelWithTools.invoke(messages);
      console.log(`✅ [ENHANCED_AGENT] Model response received`);

      // Check if model wants to use tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 [ENHANCED_AGENT] Model requested ${response.tool_calls.length} tool call(s)`);
        
        // Add model response with tool calls to conversation
        messages.push(response);

        // Execute all tool calls
        const toolResults = [];
        for (const toolCall of response.tool_calls) {
          const tool = tools.find(t => t.name === toolCall.name);
          if (tool) {
            try {
              console.log(`🔧 [ENHANCED_AGENT] Executing tool: ${toolCall.name}`);
              
              // Enhance tool args with user context
              const toolArgs = { ...toolCall.args };
              if (phoneNumber) {
                // Auto-fill phoneNumber for tools that need it (phone number is primary identifier)
                const toolsNeedingPhoneNumber = ['createReminder', 'getReminders', 'getCallHistory'];
                if (toolsNeedingPhoneNumber.includes(toolCall.name) && !toolArgs.phoneNumber) {
                  toolArgs.phoneNumber = phoneNumber;
                }
                // Note: We use phoneNumber as primary identifier, not userId
              }

              const toolResult = await tool.invoke(toolArgs);
              toolResults.push({
                tool: toolCall.name,
                result: toolResult
              });
              allToolResults.push({
                tool: toolCall.name,
                result: toolResult
              });

              // Add tool result as ToolMessage
              messages.push(new ToolMessage({
                content: toolResult,
                tool_call_id: toolCall.id || toolCall.name
              }));

              console.log(`✅ [ENHANCED_AGENT] Tool ${toolCall.name} executed successfully`);
            } catch (error) {
              console.error(`❌ [ENHANCED_AGENT] Tool execution error:`, error);
              const errorResult = JSON.stringify({
                success: false,
                error: error.message || 'Tool execution failed'
              });
              toolResults.push({
                tool: toolCall.name,
                result: errorResult
              });
              messages.push(new ToolMessage({
                content: errorResult,
                tool_call_id: toolCall.id || toolCall.name
              }));
            }
          } else {
            console.warn(`⚠️ [ENHANCED_AGENT] Tool not found: ${toolCall.name}`);
          }
        }

        // Continue loop to get model's response with tool results
        // The model will process tool results and either:
        // 1. Make more tool calls (continue loop)
        // 2. Provide final answer (break loop)
        continue;
      } else {
        // No tool calls - model provided final answer
        finalResponse = response.content;
        messages.push(response); // Add final response to conversation
        console.log(`✅ [ENHANCED_AGENT] Final response received after ${iteration} iteration(s)`);
        break;
      }
    }

    // Safety check - if we hit max iterations, use the last response
    if (!finalResponse && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage instanceof AIMessage) {
        finalResponse = lastMessage.content;
      } else {
        finalResponse = 'I apologize, but I encountered an issue processing your request. Please try again.';
      }
      console.warn(`⚠️ [ENHANCED_AGENT] Hit max iterations, using last response`);
    }

    return {
      success: true,
      message: finalResponse || 'I apologize, but I encountered an issue processing your request.',
      toolCalls: allToolResults.length > 0 ? allToolResults : undefined,
      iterations: iteration
    };

  } catch (error) {
    console.error('❌ [ENHANCED_AGENT] Error:', error);
    return {
      success: false,
      message: 'I apologize, but I encountered an issue processing your request. Please try again.',
      error: error.message
    };
  }
}

