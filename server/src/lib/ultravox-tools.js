// Ultravox tools for real-time tool integration during calls
// Ultravox requires HTTPS URLs for webhooks
// For local development, use ngrok or set SERVER_URL to your deployed HTTPS URL
let WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.API_BASE_URL || process.env.SERVER_URL || process.env.WEBHOOK_URL_CLOUDFLARE;
// Remove trailing slash if present
if (WEBHOOK_URL && WEBHOOK_URL.endsWith('/')) {
  WEBHOOK_URL = WEBHOOK_URL.slice(0, -1);
}
console.log('🔑 WEBHOOK_URL:', WEBHOOK_URL);

/**
 * Get the reminder creation tool definition
 * This tool allows the AI to create reminders by calling the webhook API
 * 
 * DISABLED: Currently using LangChain to process transcripts after calls end
 * This may be re-enabled in the future if we need real-time reminder creation during calls
 */
export function getReminderCreationTool(userPhoneNumber, userId) {
  // Disabled - using LangChain transcript processing instead
  return null;

  /* COMMENTED OUT - Keep for future reference
  if (!WEBHOOK_URL) {
    console.warn('⚠️  Skipping reminder tool - WEBHOOK_URL not configured');
    return null;
  }

  // Validate HTTPS requirement when tool is actually used
  if (!WEBHOOK_URL.startsWith('https://')) {
    throw new Error(
      `❌ Ultravox requires HTTPS URLs for webhooks. Current URL: ${WEBHOOK_URL}\n` +
      `   For local development:\n` +
      `   1. Install ngrok: npm install -g ngrok\n` +
      `   2. Run: ngrok http 3001\n` +
      `   3. Set SERVER_URL=https://your-ngrok-url.ngrok.io\n` +
      `   Or use your deployed HTTPS URL (e.g., https://your-backend.railway.app)`
    );
  }

  return {
    temporaryTool: {
      modelToolName: 'createReminder',
      description: 'Create a reminder for the user. Use this when the user asks to be reminded about something (medications, appointments, exercises, etc.). You must have all the information: what to remind about, when (time), and frequency (if recurring).',
      dynamicParameters: [
        {
          name: 'what',
          location: 'PARAMETER_LOCATION_BODY',
          schema: {
            type: 'string',
            description: 'What the user needs to be reminded about (e.g., "Take medicine", "Doctor appointment", "Exercise")'
          },
          required: true
        },
        {
          name: 'time',
          location: 'PARAMETER_LOCATION_BODY',
          schema: {
            type: 'string',
            description: 'When to remind the user. Can be specific time like "9:00 AM", "2:30 PM", or relative like "after dinner", "morning", "evening", "night"'
          },
          required: true
        },
        {
          name: 'frequency',
          location: 'PARAMETER_LOCATION_BODY',
          schema: {
            type: 'string',
            enum: ['once', 'daily', 'twice a day', 'weekly', 'monthly'],
            description: 'How often to remind. Use "once" for one-time reminders, "daily" for every day, "twice a day" for morning and evening, "weekly" for once per week, "monthly" for once per month'
          },
          required: false
        }
      ],
      staticParameters: [
        {
          name: 'phoneNumber',
          location: 'PARAMETER_LOCATION_BODY',
          value: userPhoneNumber
        },
        {
          name: 'userId',
          location: 'PARAMETER_LOCATION_BODY',
          value: userId || 'unknown'
        }
      ],
      http: {
        baseUrlPattern: `${WEBHOOK_URL}/api/reminders/webhook`,
        httpMethod: 'POST'
      },
      defaultReaction: 'AGENT_REACTION_SPEAKS'
    }
  };
  */
}

/**
 * Create Ultravox tool definition helper
 */
function createUltravoxTool(config) {
  if (!WEBHOOK_URL) {
    console.warn('⚠️  Skipping tool - WEBHOOK_URL not configured');
    return null;
  }

  if (!WEBHOOK_URL.startsWith('https://')) {
    console.warn(`⚠️  Ultravox requires HTTPS URLs. Current: ${WEBHOOK_URL}`);
    return null;
  }

  return {
    temporaryTool: {
      modelToolName: config.name,
      description: config.description,
      dynamicParameters: config.dynamicParameters || [],
      staticParameters: config.staticParameters || [],
      http: {
        baseUrlPattern: `${WEBHOOK_URL}${config.endpoint}`,
        httpMethod: config.method || 'POST'
      },
      defaultReaction: config.reaction || 'AGENT_REACTION_SPEAKS'
    }
  };
}

/**
 * Get chat API tool for Ultravox
 * 
 * This is the ONLY tool Ultravox needs. It connects to the Langchain agent
 * which has access to ALL healthcare tools (appointments, medical records, 
 * prescriptions, patient profiles, reminders, etc.)
 */
function getChatApiTool(userPhoneNumber, userId) {
  return createUltravoxTool({
    name: 'chatWithAgent',
    description: `Communicate with the Langchain AI agent that has access to ALL healthcare tools. Use this tool for ANY request:
- Booking appointments: "Book an appointment with Dr. Smith on January 15th at 2 PM"
- Checking availability: "What slots are available for Dr. Smith tomorrow?"
- Medical records: "Show me my medical history" or "Add a new diagnosis"
- Prescriptions: "What medications am I taking?" or "Create a prescription"
- Patient profile: "What are my allergies?" or "Update my address"
- Reminders: "Remind me to take medicine at 9 AM daily"
- Health questions: "I have a headache, what should I do?"
The agent will handle everything and return a response.`,
    endpoint: '/api/ultravox/tools/chat',
    method: 'POST',
    staticParameters: [
      {
        name: 'phoneNumber',
        location: 'PARAMETER_LOCATION_BODY',
        value: userPhoneNumber
      },
      {
        name: 'userId',
        location: 'PARAMETER_LOCATION_BODY',
        value: userId || 'unknown'
      }
    ],
    dynamicParameters: [
      {
        name: 'message',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'The message or question to send to the AI agent'
        },
        required: true
      },
      {
        name: 'conversationHistory',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'array',
          description: 'Previous conversation messages (optional)'
        },
        required: false
      }
    ]
  });
}

/**
 * Get appointment booking tool
 */
function getBookAppointmentTool(userPhoneNumber, userId) {
  return createUltravoxTool({
    name: 'bookAppointment',
    description: 'Book an appointment with a doctor. Use this when the user wants to schedule an appointment.',
    endpoint: '/api/ultravox/tools/book-appointment',
    method: 'POST',
    staticParameters: [
      {
        name: 'patientPhoneNumber',
        location: 'PARAMETER_LOCATION_BODY',
        value: userPhoneNumber
      },
      {
        name: 'patientId',
        location: 'PARAMETER_LOCATION_BODY',
        value: userId || 'unknown'
      }
    ],
    dynamicParameters: [
      {
        name: 'doctorId',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'Doctor ID to book appointment with'
        },
        required: true
      },
      {
        name: 'date',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'Appointment date in YYYY-MM-DD format (e.g., "2024-01-15")'
        },
        required: true
      },
      {
        name: 'time',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'Appointment time in HH:MM format (e.g., "14:30")'
        },
        required: true
      },
      {
        name: 'type',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          enum: ['consultation', 'follow-up', 'checkup', 'emergency', 'other'],
          description: 'Type of appointment'
        },
        required: false
      },
      {
        name: 'reason',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'Reason for the appointment'
        },
        required: false
      }
    ]
  });
}

/**
 * Get available slots tool
 */
function getAvailableSlotsTool() {
  return createUltravoxTool({
    name: 'getAvailableSlots',
    description: 'Get available appointment slots for a doctor on a specific date. Use this when the user wants to book an appointment and needs to see available times.',
    endpoint: '/api/ultravox/tools/get-available-slots',
    method: 'POST',
    dynamicParameters: [
      {
        name: 'doctorId',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'Doctor ID'
        },
        required: true
      },
      {
        name: 'date',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., "2024-01-15")'
        },
        required: true
      }
    ]
  });
}

/**
 * Get patient profile tool
 */
function getPatientProfileTool(userPhoneNumber, userId) {
  return createUltravoxTool({
    name: 'getPatientProfile',
    description: 'Get patient profile information including allergies and medical history. Use this when you need to know about the patient\'s background.',
    endpoint: '/api/ultravox/tools/get-patient-profile',
    method: 'POST',
    staticParameters: [
      {
        name: 'patientPhoneNumber',
        location: 'PARAMETER_LOCATION_BODY',
        value: userPhoneNumber
      },
      {
        name: 'patientId',
        location: 'PARAMETER_LOCATION_BODY',
        value: userId || 'unknown'
      }
    ]
  });
}

/**
 * Get all tools for a call based on user context
 * 
 * SIMPLIFIED ARCHITECTURE:
 * - Ultravox only has ONE tool: chatWithAgent
 * - This tool connects to Langchain agent which has ALL healthcare tools
 * - Langchain handles: appointments, medical records, prescriptions, patient profiles, etc.
 * - Ultravox just relays the conversation between user and Langchain agent
 */
export function getCallTools(userPhoneNumber, userId) {
  const tools = [];

  // ONLY tool: Chat API that connects to Langchain agent
  // Langchain agent has access to ALL tools:
  // - bookAppointment, getAppointments, cancelAppointment, getAvailableSlots
  // - createMedicalRecord, getMedicalRecords
  // - getPatientProfile, updatePatientProfile, addAllergy
  // - createPrescription, getPrescriptions
  // - createReminder, getReminders, cancelReminder
  // - webSearch, searchMedicalKnowledge, analyzeHealthImage, getCallHistory
  const chatTool = getChatApiTool(userPhoneNumber, userId);
  if (chatTool) {
    tools.push(chatTool);
    console.log(`✅ [ULTRAVOX] Created chatWithAgent tool for user ${userPhoneNumber}`);
    console.log(`   → This tool connects to Langchain agent with all healthcare tools`);
  } else {
    console.warn(`⚠️  [ULTRAVOX] Could not create chatWithAgent tool - WEBHOOK_URL not configured`);
  }

  return tools;
}

