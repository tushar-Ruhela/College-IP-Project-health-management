/**
 * Ultravox Tools Configuration
 * Defines tools available to the AI agent during calls
 */

const WEBHOOK_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://m-app-livid.vercel.app';

/**
 * Get the reminder creation tool definition
 * This tool allows the AI to create reminders by calling the webhook API
 */
export function getReminderCreationTool(userPhoneNumber: string, userId: string) {
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
}

/**
 * Get all tools for a call based on user context
 */
export function getCallTools(userPhoneNumber: string, userId: string) {
  return [
    getReminderCreationTool(userPhoneNumber, userId)
  ];
}

