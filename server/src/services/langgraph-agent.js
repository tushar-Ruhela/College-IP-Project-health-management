import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { getLangChainTools } from './langchain-agent.js';
import { getOrCreateUser } from './users.js';
import { getCallHistoryByPhoneNumber } from './call-history.js';

/**
 * LangGraph Agent Service
 * 
 * Implements a ReAct agent loop with stateful orchestration
 * 
 * Architecture:
 * - State machine with checkpoints
 * - Multi-step reasoning with tools
 * - Conditional routing based on agent decisions
 * - Memory/context management
 */

// Initialize Gemini model (lazy)
let chatModel = null;

function getChatModel() {
  if (!chatModel) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY must be set');
    }

    console.log('🤖 [LANGGRAPH] Initializing Gemini model:', modelName);
    chatModel = new ChatGoogleGenerativeAI({
      modelName,
      temperature: 0.7,
      maxOutputTokens: 2048,
      apiKey,
    });
    console.log('✅ [LANGGRAPH] Gemini model initialized');
  }
  return chatModel;
}

/**
 * Agent State Schema
 * This defines what data flows through the graph
 * Using Annotation.Root for proper LangGraph state definition
 * 
 * Based on LangGraph documentation examples:
 * - Simple fields: Annotation (no type parameter needed in JS)
 * - Fields with reducers: Annotation({ reducer: (x, y) => ... })
 */
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => y.concat(x),
    default: () => [],
  }),
  user: Annotation,
  phoneNumber: Annotation,
  userId: Annotation,
  systemPrompt: Annotation,
  toolResults: Annotation({
    reducer: (x, y) => (y || []).concat(x || []),
    default: () => [],
  }),
  iterationCount: Annotation({
    reducer: (x) => (x || 0) + 1,
    default: () => 0,
  }),
});

/**
 * Maximum iterations to prevent infinite loops
 */
const MAX_ITERATIONS = 10;

/**
 * Node: Load User Context
 * Fetches user information if phoneNumber is available
 */
async function loadUserContextNode(state) {
  console.log('👤 [LANGGRAPH] Loading user context...');
  
  if (!state.phoneNumber) {
    console.log('⚠️  [LANGGRAPH] No phone number provided, skipping user context');
    return { user: null };
  }

  try {
    const user = await getOrCreateUser(state.phoneNumber);
    console.log('✅ [LANGGRAPH] User context loaded:', {
      userId: user.userId,
      name: user.name,
      phoneNumber: user.phoneNumber
    });
    
    return {
      user,
      userId: user.userId || null
    };
  } catch (error) {
    console.error('❌ [LANGGRAPH] Error loading user context:', error);
    return { user: null };
  }
}

/**
 * Node: Build System Prompt
 * Creates a comprehensive system prompt with user context
 */
function buildSystemPromptNode(state) {
  console.log('📋 [LANGGRAPH] Building system prompt...');
  
  const user = state.user;
  const basePrompt = `You are a helpful, empathetic healthcare assistant. Your role is to:

1. **Provide Health Guidance**: Answer health-related questions with empathy and care
2. **Manage Reminders**: Help users create, view, and cancel medication/appointment reminders
3. **Access Information**: Use tools to search for information when needed
4. **Maintain Context**: Remember previous conversations and user preferences

**Communication Style:**
- Be warm, empathetic, and professional
- Use clear, simple language
- Format responses with markdown for readability
- Use **bold** for important points
- Use bullet points (-) for lists
- Use numbered lists (1.) for steps

**Available Tools:**
- createReminder: Create reminders for medications, appointments, exercises, etc.
- getReminders: View all active reminders for a user
- cancelReminder: Cancel a specific reminder
${user ? `
**User Context:**
- Phone Number: ${user.phoneNumber}
- User ID: ${user.userId || 'Not set'}
${user.name ? `- Name: ${user.name}` : ''}
${user.metadata?.preferredLanguage ? `- Preferred Language: ${user.metadata.preferredLanguage}` : ''}
${user.metadata?.location ? `- Location: ${user.metadata.location}` : ''}
` : ''}

**Important Guidelines:**
- Always use tools when the user wants to create, view, or cancel reminders
- When creating reminders, extract: what, time, and frequency from natural language
- Be proactive in helping users manage their health
- If you don't know something, say so rather than guessing
- For medical emergencies, advise users to contact emergency services immediately`;

  return {
    systemPrompt: basePrompt
  };
}

/**
 * Node: Call LLM
 * Invokes the LLM with the current state and tools
 */
async function callLLMNode(state) {
  console.log(`🤖 [LANGGRAPH] Calling LLM (iteration ${state.iterationCount})...`);
  
  const model = getChatModel();
  // Use all tools for LangGraph (it handles tool selection better)
  const tools = getLangChainTools(true);
  const modelWithTools = model.bindTools(tools);

  // Build messages array
  const messages = [];
  
  // Add system message if we have one
  if (state.systemPrompt) {
    messages.push(new SystemMessage(state.systemPrompt));
  }

  // Add all messages from state (they should already be LangChain message objects)
  if (state.messages && state.messages.length > 0) {
    state.messages.forEach(msg => {
      // If it's already a LangChain message, use it directly
      if (msg instanceof SystemMessage || msg instanceof HumanMessage || msg instanceof AIMessage || msg instanceof ToolMessage) {
        messages.push(msg);
      } 
      // Otherwise convert from plain object format
      else if (typeof msg === 'object') {
        if (msg.role === 'system' || msg._getType?.() === 'system') {
          messages.push(new SystemMessage(msg.content || msg.text || ''));
        } else if (msg.role === 'user' || msg.role === 'human' || msg._getType?.() === 'human') {
          messages.push(new HumanMessage(msg.content || msg.text || ''));
        } else if (msg.role === 'assistant' || msg.role === 'ai' || msg._getType?.() === 'ai') {
          messages.push(new AIMessage(msg.content || msg.text || ''));
        } else if (msg.role === 'tool' || msg._getType?.() === 'tool') {
          messages.push(new ToolMessage({
            content: msg.content || msg.text || '',
            tool_call_id: msg.tool_call_id || msg.name || ''
          }));
        }
      }
    });
  }

  try {
    console.log(`📤 [LANGGRAPH] Invoking LLM with ${messages.length} message(s)`);
    const response = await modelWithTools.invoke(messages);
    console.log('✅ [LANGGRAPH] LLM response received');
    console.log(`📊 [LANGGRAPH] Response type: ${response.constructor?.name || typeof response}`);
    console.log(`📊 [LANGGRAPH] Response has ${response.tool_calls?.length || 0} tool call(s)`);
    console.log(`📊 [LANGGRAPH] Response content type: ${typeof response.content}`);
    console.log(`📊 [LANGGRAPH] Response content length: ${response.content?.length || 0}`);
    if (response.content) {
      console.log(`📝 [LANGGRAPH] Response content preview: ${String(response.content).substring(0, 100)}...`);
    }
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 [LANGGRAPH] Tool calls details:`, response.tool_calls.map(tc => ({
        name: tc.name,
        id: tc.id,
        args: Object.keys(tc.args || {})
      })));
    }
    
    return {
      messages: [response]
    };
  } catch (error) {
    console.error('❌ [LANGGRAPH] Error calling LLM:', error);
    throw error;
  }
}

/**
 * Node: Execute Tools
 * Executes tool calls from the LLM
 */
async function executeToolsNode(state) {
  console.log('🔧 [LANGGRAPH] Executing tools...');
  
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (!lastMessage || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    console.log('ℹ️  [LANGGRAPH] No tool calls to execute');
    return { messages: [], toolResults: [] };
  }

  // Use all tools for LangGraph tool execution
  const tools = getLangChainTools(true);
  const toolResults = [];
  const toolMessages = [];
  const user = state.user;

  for (const toolCall of lastMessage.tool_calls) {
    const tool = tools.find(t => t.name === toolCall.name);
    if (!tool) {
      console.warn(`⚠️  [LANGGRAPH] Tool not found: ${toolCall.name}`);
      continue;
    }

    try {
      console.log(`🔧 [LANGGRAPH] Executing tool: ${toolCall.name}`);
      
      // Enhance tool args with user context if available
      const toolArgs = { ...toolCall.args };
      if (user && user.phoneNumber) {
        // Auto-inject phoneNumber and userId for reminder tools
        if (toolCall.name === 'createReminder') {
          if (!toolArgs.phoneNumber) toolArgs.phoneNumber = user.phoneNumber;
          if (!toolArgs.userId && user.userId) toolArgs.userId = user.userId;
        }
        if (toolCall.name === 'getReminders') {
          if (!toolArgs.phoneNumber) toolArgs.phoneNumber = user.phoneNumber;
        }
      }
      
      const result = await tool.invoke(toolArgs);
      const toolCallId = toolCall.id || `${toolCall.name}_${Date.now()}`;
      
      toolResults.push({
        tool: toolCall.name,
        result: result,
        tool_call_id: toolCallId
      });
      
      // Create ToolMessage for LangChain
      toolMessages.push(new ToolMessage({
        content: result,
        tool_call_id: toolCallId
      }));
      
      console.log(`✅ [LANGGRAPH] Tool ${toolCall.name} executed successfully`);
    } catch (error) {
      console.error(`❌ [LANGGRAPH] Error executing tool ${toolCall.name}:`, error);
      const errorResult = JSON.stringify({ success: false, error: error.message });
      const toolCallId = toolCall.id || `${toolCall.name}_${Date.now()}`;
      
      toolResults.push({
        tool: toolCall.name,
        result: errorResult,
        tool_call_id: toolCallId
      });
      
      toolMessages.push(new ToolMessage({
        content: errorResult,
        tool_call_id: toolCallId
      }));
    }
  }

  return {
    messages: toolMessages,
    toolResults: toolResults
  };
}

/**
 * Conditional Edge: Should Continue?
 * Determines if the agent should continue (more tool calls) or finish
 * Returns 'tools' to execute tools, or 'end' to finish
 */
function shouldContinue(state) {
  console.log('🤔 [LANGGRAPH] Deciding whether to continue...');
  console.log(`   📊 [LANGGRAPH] State iteration count: ${state.iterationCount}/${MAX_ITERATIONS}`);
  console.log(`   📊 [LANGGRAPH] Total messages: ${state.messages?.length || 0}`);
  
  if (!state.messages || state.messages.length === 0) {
    console.log('⚠️  [LANGGRAPH] No messages in state, ending');
    return 'end';
  }
  
  // IMPORTANT: The reducer prepends messages, so index 0 is the NEWEST message
  // We need to check index 0, not the last index!
  const newestMessage = state.messages[0];
  const lastMessage = state.messages[state.messages.length - 1];
  
  console.log(`   📊 [LANGGRAPH] Newest message (index 0) type: ${newestMessage?.constructor?.name || typeof newestMessage}`);
  console.log(`   📊 [LANGGRAPH] Newest message keys: ${Object.keys(newestMessage || {}).join(', ')}`);
  console.log(`   📊 [LANGGRAPH] Last message (index ${state.messages.length - 1}) type: ${lastMessage?.constructor?.name || typeof lastMessage}`);
  
  // Check iteration limit
  if (state.iterationCount >= MAX_ITERATIONS) {
    console.log('⚠️  [LANGGRAPH] Max iterations reached, ending');
    return 'end';
  }

  // Check if newest message (index 0) has tool calls - try multiple ways to access
  let toolCalls = null;
  if (newestMessage) {
    toolCalls = newestMessage.tool_calls || 
                newestMessage.toolCalls ||
                (newestMessage.additional_kwargs && newestMessage.additional_kwargs.tool_calls) ||
                null;
  }
  
  const hasToolCalls = toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0;
  
  console.log(`   🔧 [LANGGRAPH] Tool calls found: ${hasToolCalls}`);
  if (hasToolCalls) {
    console.log(`   🔧 [LANGGRAPH] Tool calls count: ${toolCalls.length}`);
    console.log(`   🔧 [LANGGRAPH] Tool call names: ${toolCalls.map(tc => tc.name || tc.function?.name || 'unknown').join(', ')}`);
  } else {
    console.log(`   🔧 [LANGGRAPH] No tool calls detected in newest message. tool_calls: ${newestMessage?.tool_calls}, toolCalls: ${newestMessage?.toolCalls}`);
    if (newestMessage?.additional_kwargs) {
      console.log(`   🔧 [LANGGRAPH] additional_kwargs keys: ${Object.keys(newestMessage.additional_kwargs).join(', ')}`);
    }
  }

  // If newest message has tool calls, continue to execute tools
  if (hasToolCalls) {
    console.log('🔄 [LANGGRAPH] Tool calls detected, continuing to execute tools');
    return 'tools';
  }

  // Otherwise, we're done
  console.log('✅ [LANGGRAPH] No more tool calls, ending');
  return 'end';
}

/**
 * Build the LangGraph agent
 */
function buildAgent() {
  console.log('🏗️  [LANGGRAPH] Building agent graph...');

  const graph = new StateGraph(AgentState)
    // Add nodes
    .addNode('loadUserContext', loadUserContextNode)
    .addNode('buildSystemPrompt', buildSystemPromptNode)
    .addNode('callLLM', callLLMNode)
    .addNode('executeTools', executeToolsNode)
    
    // Define edges
    .addEdge(START, 'loadUserContext')
    .addEdge('loadUserContext', 'buildSystemPrompt')
    .addEdge('buildSystemPrompt', 'callLLM')
    .addConditionalEdges('callLLM', shouldContinue, {
      tools: 'executeTools',
      end: END
    })
    .addEdge('executeTools', 'callLLM') // Loop back to LLM after tools
    
    // Compile the graph
    .compile();

  console.log('✅ [LANGGRAPH] Agent graph built and compiled');
  return graph;
}

// Cache the compiled graph
let compiledAgent = null;

/**
 * Get or create the compiled agent
 */
function getAgent() {
  if (!compiledAgent) {
    compiledAgent = buildAgent();
  }
  return compiledAgent;
}

/**
 * Process a chat message with the LangGraph agent
 * 
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {string} phoneNumber - User's phone number (optional)
 * @param {string} userId - User's ID (optional)
 * @returns {Promise<{success: boolean, message?: string, toolCalls?: Array, error?: string}>}
 */
export async function processChatWithLangGraph(message, conversationHistory = [], phoneNumber = null, userId = null) {
  console.log('🚀 [LANGGRAPH] Starting chat processing...');
  console.log('📝 [LANGGRAPH] Message:', message.substring(0, 50) + '...');
  console.log('📊 [LANGGRAPH] History length:', conversationHistory.length);
  console.log('📱 [LANGGRAPH] Phone number:', phoneNumber || 'not provided');

  try {
    const agent = getAgent();

    // Convert conversation history to LangChain messages
    const historyMessages = conversationHistory.map(msg => {
      if (msg.role === 'user' || msg.role === 'human') {
        return new HumanMessage(msg.content);
      } else if (msg.role === 'assistant' || msg.role === 'ai') {
        return new AIMessage(msg.content);
      }
      return null;
    }).filter(Boolean);

    // Add current user message
    const currentMessage = new HumanMessage(message);
    const allMessages = [...historyMessages, currentMessage];

    // Initial state
    const initialState = {
      messages: allMessages,
      phoneNumber: phoneNumber,
      userId: userId,
      iterationCount: 0
    };

    console.log('🔄 [LANGGRAPH] Invoking agent with initial state...');
    const result = await agent.invoke(initialState);
    console.log('✅ [LANGGRAPH] Agent execution completed');
    console.log('📊 [LANGGRAPH] Result keys:', Object.keys(result));
    console.log('📊 [LANGGRAPH] Messages in result:', result.messages?.length || 0);

    // Extract final response - find the last AI message that's not just tool calls
    const finalMessages = result.messages || [];
    console.log('📋 [LANGGRAPH] Total messages in final state:', finalMessages.length);
    
    // Log all messages for debugging
    finalMessages.forEach((msg, idx) => {
      const msgType = msg instanceof AIMessage ? 'AIMessage' : 
                     msg instanceof HumanMessage ? 'HumanMessage' :
                     msg instanceof SystemMessage ? 'SystemMessage' :
                     msg instanceof ToolMessage ? 'ToolMessage' :
                     msg?.constructor?.name || typeof msg;
      const content = msg?.content || msg?.text || 'NO CONTENT';
      const isInstance = msg instanceof AIMessage;
      const constructorName = msg?.constructor?.name;
      const hasRole = msg?.role;
      console.log(`  [${idx}] ${msgType} (instanceof: ${isInstance}, constructor: ${constructorName}, role: ${hasRole}): ${String(content).substring(0, 50)}...`);
    });
    
    let lastAIMessage = null;
    
    // Helper function to extract text content from various formats
    const extractTextContent = (content) => {
      if (typeof content === 'string') {
        return content;
      } else if (Array.isArray(content)) {
        // Content might be an array of text parts
        return content.map(c => {
          if (typeof c === 'string') return c;
          if (c?.text) return c.text;
          if (c?.content) return c.content;
          return String(c);
        }).join(' ');
      } else if (content && typeof content === 'object') {
        // Content might be an object with text property
        return content.text || content.content || content.toString();
      }
      return String(content || '');
    };

    // First, try to get the message at index 0 directly (most recent)
    // This is a quick check since the reducer prepends new messages
    if (finalMessages.length > 0) {
      const firstMsg = finalMessages[0];
      const firstContent = firstMsg?.content || firstMsg?.text;
      const firstContentStr = extractTextContent(firstContent);
      
      // Check if it looks like a valid AI response (not an error, has content)
      if (firstContentStr && 
          firstContentStr.trim().length > 20 && 
          !firstContentStr.includes('I apologize, but I encountered an issue')) {
        console.log(`🎯 [LANGGRAPH] Quick check: Index 0 has valid content (${firstContentStr.length} chars), using it`);
        lastAIMessage = firstMsg;
      } else {
        console.log(`🎯 [LANGGRAPH] Quick check: Index 0 content type: ${typeof firstContent}, length: ${firstContentStr.length}`);
      }
    }
    
    // If quick check didn't work, do full search
    if (!lastAIMessage) {
      console.log('🔍 [LANGGRAPH] Quick check failed, doing full search...');
      // Look for the FIRST (most recent) AIMessage (going forwards from index 0)
      // Because the reducer prepends new messages, the latest is at index 0
      for (let i = 0; i < finalMessages.length; i++) {
      const msg = finalMessages[i];
      const msgType = msg?.constructor?.name || typeof msg;
      const isInstanceOf = msg instanceof AIMessage;
      const constructorName = msg?.constructor?.name;
      const hasRole = msg?.role;
      const hasGetType = typeof msg?._getType === 'function';
      
      console.log(`🔍 [LANGGRAPH] Checking message at index ${i}:`);
      console.log(`   Type: ${msgType}, instanceof AIMessage: ${isInstanceOf}, constructor: ${constructorName}, role: ${hasRole}`);
      
      // Check if it's an AIMessage (multiple ways to check)
      // Try _getType first as it's the most reliable
      let isAIMessage = false;
      if (hasGetType) {
        try {
          const msgType = msg._getType();
          isAIMessage = msgType === 'ai' || msgType === 'AIMessage';
          console.log(`   _getType() returned: ${msgType}`);
        } catch (e) {
          console.log(`   _getType() error: ${e.message}`);
        }
      }
      
      // Fallback to other checks
      if (!isAIMessage) {
        isAIMessage = isInstanceOf || 
                     (msg && typeof msg === 'object' && (
                       constructorName === 'AIMessage' ||
                       hasRole === 'assistant' ||
                       hasRole === 'ai' ||
                       (msg.lc_id && msg.lc_id.includes('AIMessage'))
                     ));
      }
      
      console.log(`   Is AIMessage: ${isAIMessage} (checked: instanceof=${isInstanceOf}, constructor=${constructorName}, role=${hasRole})`);
      
      if (isAIMessage) {
        // Get content from various possible locations and extract text
        const rawContent = msg.content || msg.text || (typeof msg === 'string' ? msg : null);
        const contentStr = extractTextContent(rawContent);
        const contentLength = contentStr.trim().length;
        
        console.log(`   ✅ Found AIMessage at index ${i}, content type: ${typeof rawContent}, length: ${contentLength}`);
        console.log(`   📝 Content preview: ${contentStr.substring(0, 100)}...`);
        
        // Skip error messages (they're 64 chars and start with "I apologize")
        if (contentStr.includes('I apologize, but I encountered an issue')) {
          console.log(`   ⏭️  Skipping error message at index ${i}`);
          continue;
        }
        
        // Use this message if it has valid content
        if (rawContent && contentLength > 0 && contentStr.trim().length > 0) {
          lastAIMessage = msg;
          console.log(`   ✅✅ Using AIMessage at index ${i} with content: ${contentStr.substring(0, 100)}...`);
          break;
        } else {
          console.log(`   ⚠️  AIMessage at index ${i} has no valid content`);
        }
      } else {
        console.log(`   ❌ Not an AIMessage, skipping`);
      }
      }
    }

    // Fallback: If no AIMessage found but index 0 has content, use it
    if (!lastAIMessage && finalMessages.length > 0) {
      const firstMsg = finalMessages[0];
      const firstContent = firstMsg?.content || firstMsg?.text;
      const firstContentStr = extractTextContent(firstContent);
      
      // If first message has content and it's not an error, use it
      if (firstContentStr && 
          firstContentStr.trim().length > 20 && 
          !firstContentStr.includes('I apologize, but I encountered an issue')) {
        console.log(`⚠️  [LANGGRAPH] No AIMessage detected, but using first message content as fallback`);
        lastAIMessage = firstMsg;
      }
    }
    
    let finalResponse;
    if (lastAIMessage) {
      const rawContent = lastAIMessage.content || lastAIMessage.text;
      finalResponse = extractTextContent(rawContent);
    } else {
      console.warn('⚠️  [LANGGRAPH] No AIMessage found in final state, using fallback');
      finalResponse = 'I apologize, but I encountered an issue processing your request.';
    }
    
    // Ensure finalResponse is a string
    if (typeof finalResponse !== 'string') {
      console.warn('⚠️  [LANGGRAPH] Final response is not a string, converting:', typeof finalResponse);
      finalResponse = String(finalResponse || 'I apologize, but I encountered an issue processing your request.');
    }

    // Extract tool calls
    const toolCalls = result.toolResults || [];

    console.log('📊 [LANGGRAPH] Final response length:', finalResponse.length);
    console.log('🔧 [LANGGRAPH] Tool calls executed:', toolCalls.length);

    return {
      success: true,
      message: finalResponse,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };

  } catch (error) {
    console.error('❌ [LANGGRAPH] Error processing chat:', error);
    return {
      success: false,
      error: error.message || 'Failed to process chat message'
    };
  }
}

