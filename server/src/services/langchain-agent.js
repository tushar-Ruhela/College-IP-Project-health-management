import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { createReminder, getRemindersForPhone, cancelReminder } from './reminder-scheduler.js';
import { webSearchTool } from './tools/web-search.js';
// Use vector search version if available, fallback to keyword search
import { medicalKnowledgeVectorTool } from './tools/medical-knowledge-vector.js';
const medicalKnowledgeTool = medicalKnowledgeVectorTool;
import { imageAnalysisTool } from './tools/image-analysis.js';
import { mediscanTool } from './tools/mediscan.js';
import { callHistoryTool } from './tools/call-history.js';
import {
  bookAppointmentTool,
  getAppointmentsTool,
  cancelAppointmentTool,
  getAvailableSlotsTool,
  createMedicalRecordTool,
  getMedicalRecordsTool,
  getPatientProfileTool,
  updatePatientProfileTool,
  addAllergyTool,
  createPrescriptionTool,
  getPrescriptionsTool
} from './tools/healthcare-tools.js';
import { findDoctorsByLocationTool } from './tools/find-doctors.js';

/**
 * LangChain Agent Service with Gemini Flash
 * Provides tools for the LLM to interact with the system
 * 
 * Available Gemini models:
 * - 'gemini-1.5-flash' (stable, fast)
 * - 'gemini-1.5-pro' (more capable)
 * - 'gemini-2.0-flash-exp' (experimental, latest features)
 * 
 * Set GEMINI_MODEL env var to override default
 */

// Initialize Gemini Flash model
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyAaBgJekv3pqbVPcv8jx6sCDBiM5nJKEvA";

console.log('🚀 [LLM] Initializing Gemini model...');
console.log('📋 [LLM] Model name:', modelName);
console.log('🔑 [LLM] API key:', 'GOOGLE_API_KEY = ', apiKey, apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

const model = new ChatGoogleGenerativeAI({
  modelName,
  temperature: 0.7,
  maxOutputTokens: 2048,
  apiKey,
});

console.log('✅ [LLM] Gemini model initialized');

/**
 * Tool: Create Reminder
 */
const createReminderTool = new DynamicStructuredTool({
  name: 'createReminder',
  description: `Create a new reminder for a user. Use this when the user wants to set a reminder for medications, appointments, exercises, or any other health-related tasks.`,
  schema: z.object({
    phoneNumber: z.string().describe('User\'s phone number in E.164 format (e.g., "+1234567890")'),
    what: z.string().describe('What to remind about (e.g., "Take blood pressure medication", "Doctor appointment")'),
    time: z.string().describe('Time for the reminder (e.g., "9:00 AM", "2:30 PM", "after dinner", "morning")'),
    frequency: z.string().optional().default('once').describe('How often: "once", "daily", "twice a day", "weekly", "monthly"'),
    userId: z.string().optional().describe('User ID if available')
  }),
  func: async ({ phoneNumber, what, time, frequency = 'once', userId }) => {
    console.log('🔔 [TOOL:createReminder] Called with:', { phoneNumber, what, time, frequency, userId });
    try {
      if (!phoneNumber || !what || !time) {
        console.error('❌ [TOOL:createReminder] Missing required fields');
        return JSON.stringify({
          success: false,
          error: 'phoneNumber, what, and time are required'
        });
      }

      console.log('📞 [TOOL:createReminder] Creating reminder...');
      // Get user timezone if available (will be inferred from phone number if not set)
      const reminder = await createReminder(phoneNumber, what, time, frequency, userId);
      console.log('✅ [TOOL:createReminder] Reminder created:', reminder.id);
      
      return JSON.stringify({
        success: true,
        message: 'Reminder created successfully',
        reminder: {
          id: reminder.id,
          phoneNumber: reminder.phoneNumber,
          what: reminder.what,
          time: reminder.time,
          frequency: reminder.frequency,
          nextCallTime: new Date(reminder.nextCallTime).toISOString(),
          active: reminder.active
        }
      });
    } catch (error) {
      console.error('❌ [TOOL:createReminder] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to create reminder'
      });
    }
  }
});

/**
 * Tool: Get User Reminders
 */
const getRemindersTool = new DynamicStructuredTool({
  name: 'getReminders',
  description: `Get all active reminders for a user by their phone number. Use this when the user asks about their existing reminders or wants to check what reminders they have set.`,
  schema: z.object({
    phoneNumber: z.string().describe('User\'s phone number in E.164 format (e.g., "+1234567890")')
  }),
  func: async ({ phoneNumber }) => {
    console.log('📋 [TOOL:getReminders] Called with phoneNumber:', phoneNumber);
    try {
      if (!phoneNumber) {
        console.error('❌ [TOOL:getReminders] Missing phoneNumber');
        return JSON.stringify({
          success: false,
          error: 'phoneNumber is required'
        });
      }

      console.log('🔍 [TOOL:getReminders] Fetching reminders...');
      const reminders = await getRemindersForPhone(phoneNumber);
      console.log(`✅ [TOOL:getReminders] Found ${reminders.length} reminder(s)`);
      
      return JSON.stringify({
        success: true,
        count: reminders.length,
        reminders: reminders.map(r => ({
          id: r.id,
          what: r.what,
          time: r.time,
          frequency: r.frequency,
          nextCallTime: new Date(r.nextCallTime).toISOString(),
          active: r.active
        }))
      });
    } catch (error) {
      console.error('❌ [TOOL:getReminders] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get reminders'
      });
    }
  }
});

/**
 * Tool: Cancel Reminder
 */
const cancelReminderTool = new DynamicStructuredTool({
  name: 'cancelReminder',
  description: `Cancel or delete a reminder by its ID. Use this when the user wants to cancel or remove a reminder they previously set.`,
  schema: z.object({
    reminderId: z.string().describe('The ID of the reminder to cancel')
  }),
  func: async ({ reminderId }) => {
    console.log('🗑️  [TOOL:cancelReminder] Called with reminderId:', reminderId);
    try {
      if (!reminderId) {
        console.error('❌ [TOOL:cancelReminder] Missing reminderId');
        return JSON.stringify({
          success: false,
          error: 'reminderId is required'
        });
      }

      console.log('🔄 [TOOL:cancelReminder] Cancelling reminder...');
      const cancelled = await cancelReminder(reminderId);
      
      if (!cancelled) {
        console.warn('⚠️  [TOOL:cancelReminder] Reminder not found');
        return JSON.stringify({
          success: false,
          error: 'Reminder not found'
        });
      }

      console.log('✅ [TOOL:cancelReminder] Reminder cancelled successfully');
      return JSON.stringify({
        success: true,
        message: 'Reminder cancelled successfully'
      });
    } catch (error) {
      console.error('❌ [TOOL:cancelReminder] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to cancel reminder'
      });
    }
  }
});

/**
 * Detect if message needs tools based on keywords
 */
function needsTools(message) {
  const messageLower = message.toLowerCase();
  
  // Keywords that indicate tool usage is needed
  const toolKeywords = {
    appointment: ['appointment', 'book', 'schedule', 'doctor visit', 'see doctor', 'consultation'],
    // Include common misspelling \"remainders\" to still trigger reminder tools
    reminder: ['remind', 'reminder', 'reminders', 'remainders', 'alarm', 'notify'],
    medical: ['medical record', 'test result', 'diagnosis', 'lab report', 'prescription', 'medication'],
    doctor: ['doctor', 'clinic', 'hospital', 'find doctor', 'available doctor', 'nearest'],
    profile: ['profile', 'allergy', 'medical history', 'update my'],
    search: ['search', 'find', 'look for', 'near me', 'nearby']
  };
  
  // Check if message contains any tool-related keywords
  for (const [category, keywords] of Object.entries(toolKeywords)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get minimal tools for basic chat (fast responses)
 */
function getMinimalTools() {
  return [
    // Only essential tools that might be needed in conversation
    getPatientProfileTool,    // For context
    updatePatientProfileTool, // For name updates
    createReminderTool,       // For \"set a reminder\" style queries
    getRemindersTool,         // For \"what are my reminders\" style queries
    cancelReminderTool,       // For \"cancel my reminder\" queries
    webSearchTool,            // For general questions
    medicalKnowledgeTool      // For health questions
  ];
}

/**
 * Get all available tools (full set)
 */
export function getLangChainTools(forceAll = false, message = '') {
  // For simple messages or when tools aren't needed, use minimal set
  if (!forceAll && message && !needsTools(message)) {
    console.log('⚡ [TOOLS] Using minimal tool set for faster response');
    const minimalTools = getMinimalTools();
    console.log(`✅ [TOOLS] Loaded ${minimalTools.length} minimal tools:`, minimalTools.map(t => t.name).join(', '));
    return minimalTools;
  }
  
  console.log('🔧 [TOOLS] Getting full LangChain tools...');
  const tools = [
    // Reminder tools
    createReminderTool,
    getRemindersTool,
    cancelReminderTool,
    // Appointment tools
    bookAppointmentTool,
    getAppointmentsTool,
    cancelAppointmentTool,
    getAvailableSlotsTool,
    // Medical records tools
    createMedicalRecordTool,
    getMedicalRecordsTool,
    // Patient profile tools
    getPatientProfileTool,
    updatePatientProfileTool,
    addAllergyTool,
    // Prescription tools
    createPrescriptionTool,
    getPrescriptionsTool,
    // Enhanced tools
    findDoctorsByLocationTool,
    webSearchTool,
    medicalKnowledgeTool,
    imageAnalysisTool,
    mediscanTool,
    callHistoryTool
  ];
  console.log(`✅ [TOOLS] Loaded ${tools.length} tools:`, tools.map(t => t.name).join(', '));
  return tools;
}

/**
 * Process transcript with LLM agent
 * Analyzes the call transcript and extracts structured information, creates reminders, etc.
 */
export async function processTranscriptWithLLM(transcript, phoneNumber, userId) {
  console.log('🤖 [LLM] Starting transcript processing with LLM agent');
  console.log('📞 [LLM] Phone number:', phoneNumber);
  console.log('👤 [LLM] User ID:', userId || 'not provided');
  console.log('📝 [LLM] Transcript length:', transcript?.length || 0, 'messages');
  
  try {
    console.log('🔧 [LLM] Getting available tools...');
    // For transcript processing, use all tools (forceAll = true)
    const tools = getLangChainTools(true, transcriptText);
    console.log(`✅ [LLM] Loaded ${tools.length} tools:`, tools.map(t => t.name).join(', '));
    
    // Convert transcript to readable format
    console.log('📄 [LLM] Converting transcript to readable format...');
    const transcriptText = transcript
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : msg.role === 'agent' ? 'Assistant' : msg.role;
        return `${role}: ${msg.text || msg.content || ''}`;
      })
      .join('\n');
    console.log('✅ [LLM] Transcript converted. Length:', transcriptText.length, 'characters');

    // Create system prompt
    console.log('📋 [LLM] Creating system prompt...');
    const systemPrompt = `You are a helpful healthcare assistant analyzing a phone call transcript. Your job is to:

1. Identify if the user wants to create, view, or cancel reminders
2. Extract structured information from natural language
3. Use the available tools to perform actions

Available tools:
- createReminder: Create a new reminder (for medications, appointments, exercises, etc.)
- getReminders: Get all active reminders for a user
- cancelReminder: Cancel a specific reminder

When the user mentions wanting to be reminded about something, extract:
- What they want to be reminded about (e.g., "take medicine", "doctor appointment")
- When they want the reminder (e.g., "9 AM", "after dinner", "morning")
- How often (e.g., "daily", "once", "twice a day")

User's phone number: ${phoneNumber}
User ID: ${userId || 'not provided'}

Analyze the transcript and use the appropriate tools to help the user.`;
    console.log('✅ [LLM] System prompt created');

    // Create prompt template
    console.log('📝 [LLM] Creating prompt template...');
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', 'Transcript:\n{transcript}\n\nAnalyze this conversation and take any necessary actions using the available tools.'],
    ]);
    console.log('✅ [LLM] Prompt template created');

    // Bind tools to the model
    console.log('🔗 [LLM] Binding tools to model...');
    const modelWithTools = model.bindTools(tools);
    console.log('✅ [LLM] Tools bound to model');

    // Format messages
    console.log('💬 [LLM] Formatting messages...');
    const messages = await prompt.formatMessages({
      transcript: transcriptText
    });
    console.log(`✅ [LLM] Messages formatted. Total messages: ${messages.length}`);

    // Invoke the model
    console.log('🚀 [LLM] Invoking model with tools...');
    console.log('⏳ [LLM] Waiting for model response...');
    const response = await modelWithTools.invoke(messages);
    console.log('✅ [LLM] Model response received');
    console.log('📊 [LLM] Response content length:', response.content?.length || 0);
    console.log('🔧 [LLM] Tool calls in response:', response.tool_calls?.length || 0);

    // Execute tool calls if any
    const toolResults = [];
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 [LLM] LLM requested ${response.tool_calls.length} tool call(s)`);
      console.log(`📋 [LLM] Tool calls:`, response.tool_calls.map(tc => tc.name).join(', '));
      
      for (let i = 0; i < response.tool_calls.length; i++) {
        const toolCall = response.tool_calls[i];
        console.log(`\n🔄 [LLM] Processing tool call ${i + 1}/${response.tool_calls.length}: ${toolCall.name}`);
        
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          try {
            // Handle tool call args - could be object or string
            console.log(`📥 [LLM] Parsing tool call arguments...`);
            const args = typeof toolCall.args === 'string' 
              ? JSON.parse(toolCall.args) 
              : toolCall.args || {};
            console.log(`✅ [LLM] Tool call args parsed:`, JSON.stringify(args, null, 2));
            
            console.log(`⚙️  [LLM] Executing tool: ${toolCall.name}...`);
            const startTime = Date.now();
            const result = await tool.invoke(args);
            const duration = Date.now() - startTime;
            
            console.log(`✅ [LLM] Tool ${toolCall.name} executed successfully in ${duration}ms`);
            console.log(`📤 [LLM] Tool result:`, result);
            
            toolResults.push({
              tool_call_id: toolCall.id || toolCall.name,
              name: toolCall.name,
              result: result
            });
          } catch (error) {
            console.error(`❌ [LLM] Error executing tool ${toolCall.name}:`, error);
            console.error(`📚 [LLM] Error stack:`, error.stack);
            toolResults.push({
              tool_call_id: toolCall.id || toolCall.name,
              name: toolCall.name,
              result: JSON.stringify({ success: false, error: error.message })
            });
          }
        } else {
          console.warn(`⚠️  [LLM] Tool not found: ${toolCall.name}`);
          console.warn(`📋 [LLM] Available tools:`, tools.map(t => t.name).join(', '));
        }
      }
      console.log(`\n✅ [LLM] All tool calls processed. Total results: ${toolResults.length}`);
    } else {
      console.log('ℹ️  [LLM] No tool calls in response');
    }

    // Get final response from model with tool results
    let finalResponse = response.content;
    if (toolResults.length > 0) {
      console.log('🔄 [LLM] Getting follow-up response from model with tool results...');
      const followUpMessages = [
        ...messages,
        response,
        ...toolResults.map(tr => ({
          role: 'tool',
          content: tr.result,
          tool_call_id: tr.tool_call_id,
          name: tr.name
        }))
      ];
      console.log(`📨 [LLM] Sending ${followUpMessages.length} messages to model for follow-up...`);
      const followUpResponse = await model.invoke(followUpMessages);
      finalResponse = followUpResponse.content;
      console.log('✅ [LLM] Follow-up response received');
      console.log('📝 [LLM] Final response length:', finalResponse?.length || 0);
    } else {
      console.log('ℹ️  [LLM] No tool results to send back to model, using initial response');
    }

    const actions = toolResults.map(tr => {
      try {
        return {
          tool: tr.name,
          result: typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result
        };
      } catch (e) {
        return {
          tool: tr.name,
          result: tr.result
        };
      }
    });

    console.log('\n📊 [LLM] Processing complete! Summary:');
    console.log(`   ✅ Success: true`);
    console.log(`   🔧 Tool calls: ${response.tool_calls?.length || 0}`);
    console.log(`   📋 Actions taken: ${actions.length}`);
    if (actions.length > 0) {
      actions.forEach((action, idx) => {
        console.log(`      ${idx + 1}. ${action.tool}: ${action.result.success ? '✅' : '❌'}`);
      });
    }
    console.log(`   📝 Summary length: ${finalResponse?.length || 0} characters\n`);

    return {
      success: true,
      actions,
      summary: finalResponse,
      toolCallsCount: response.tool_calls?.length || 0
    };

  } catch (error) {
    console.error('❌ [LLM] Error processing transcript with LLM:', error);
    console.error('📚 [LLM] Error name:', error.name);
    console.error('📚 [LLM] Error message:', error.message);
    if (error.stack) {
      console.error('📚 [LLM] Error stack:', error.stack);
    }
    return {
      success: false,
      error: error.message || 'Failed to process transcript with LLM'
    };
  }
}

