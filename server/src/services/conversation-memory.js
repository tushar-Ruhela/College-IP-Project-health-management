import { Conversation } from '../models/Conversation.js';

/**
 * Conversation Memory Service
 * Manages persistent conversation history in MongoDB
 */

/**
 * Save a conversation message
 * @param {string} phoneNumber - User's phone number
 * @param {string} userId - User ID (optional)
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 * @param {Array} toolCalls - Optional tool calls associated with this message
 * @returns {Promise<Object>} Saved conversation document
 */
export async function saveConversationMessage(phoneNumber, userId, role, content, toolCalls = []) {
  try {
    if (!phoneNumber || !role || !content) {
      throw new Error('phoneNumber, role, and content are required');
    }

    // Find the most recent conversation for this user (within last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let conversation = await Conversation.findOne({
      phoneNumber,
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 });

    // If no recent conversation exists, create a new one
    if (!conversation) {
      conversation = new Conversation({
        phoneNumber,
        userId: userId || null,
        messages: [],
        summary: '',
        metadata: {}
      });
    }

    // Add the new message
    conversation.messages.push({
      role,
      content,
      timestamp: Date.now(),
      toolCalls: toolCalls || []
    });

    // Update conversation metadata
    conversation.updatedAt = Date.now();
    if (userId && !conversation.userId) {
      conversation.userId = userId;
    }

    await conversation.save();
    console.log(`💾 [MEMORY] Saved ${role} message to conversation ${conversation._id}`);
    
    return conversation;
  } catch (error) {
    console.error('❌ [MEMORY] Error saving conversation message:', error);
    throw error;
  }
}

/**
 * Get conversation history for a user
 * @param {string} phoneNumber - User's phone number
 * @param {number} limit - Number of recent conversations to retrieve (default: 5)
 * @param {number} messageLimit - Max messages per conversation (default: 50)
 * @returns {Promise<Array>} Array of conversation objects with messages
 */
export async function getConversationHistory(phoneNumber, limit = 5, messageLimit = 50) {
  try {
    if (!phoneNumber) {
      throw new Error('phoneNumber is required');
    }

    const conversations = await Conversation.find({
      phoneNumber
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('messages summary createdAt metadata userId')
      .lean();

    // Limit messages per conversation and format for LangChain
    const formattedConversations = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.slice(-messageLimit).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    }));

    console.log(`📚 [MEMORY] Retrieved ${conversations.length} conversation(s) for ${phoneNumber}`);
    
    return formattedConversations;
  } catch (error) {
    console.error('❌ [MEMORY] Error retrieving conversation history:', error);
    throw error;
  }
}

/**
 * Get the current active conversation (most recent)
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<Object|null>} Current conversation or null
 */
export async function getCurrentConversation(phoneNumber) {
  try {
    if (!phoneNumber) {
      throw new Error('phoneNumber is required');
    }

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const conversation = await Conversation.findOne({
      phoneNumber,
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .lean();

    return conversation;
  } catch (error) {
    console.error('❌ [MEMORY] Error retrieving current conversation:', error);
    throw error;
  }
}

/**
 * Update conversation summary
 * @param {string} conversationId - Conversation ID
 * @param {string} summary - Summary text
 * @returns {Promise<Object>} Updated conversation
 */
export async function updateConversationSummary(conversationId, summary) {
  try {
    if (!conversationId || !summary) {
      throw new Error('conversationId and summary are required');
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { 
        summary,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    console.log(`📝 [MEMORY] Updated summary for conversation ${conversationId}`);
    
    return conversation;
  } catch (error) {
    console.error('❌ [MEMORY] Error updating conversation summary:', error);
    throw error;
  }
}

/**
 * Format conversation history for LLM context
 * @param {Array} conversations - Array of conversation objects
 * @param {number} maxMessages - Maximum total messages to include
 * @returns {string} Formatted context string
 */
export function formatConversationContext(conversations, maxMessages = 20) {
  if (!conversations || conversations.length === 0) {
    return '';
  }

  let messageCount = 0;
  const contextParts = [];

  // Process conversations in reverse chronological order (newest first)
  for (const conv of conversations.reverse()) {
    if (messageCount >= maxMessages) break;

    const convMessages = [];
    for (const msg of conv.messages) {
      if (messageCount >= maxMessages) break;
      convMessages.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
      messageCount++;
    }

    if (convMessages.length > 0) {
      const dateStr = new Date(conv.createdAt).toLocaleDateString();
      contextParts.push(`Previous conversation (${dateStr}):\n${convMessages.join('\n')}`);
    }
  }

  if (contextParts.length === 0) {
    return '';
  }

  return `\n**PREVIOUS CONVERSATIONS:**\n${contextParts.join('\n\n')}\n`;
}



