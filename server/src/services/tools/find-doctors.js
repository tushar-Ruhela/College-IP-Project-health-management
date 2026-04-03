import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Find doctors/clinics by location using web search
 */
async function findDoctorsByLocation(location, specialization = 'general') {
  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash-exp',
      temperature: 0.3,
      maxOutputTokens: 2048,
      apiKey,
    });

    const searchQuery = `Find ${specialization} doctors, clinics, or hospitals near ${location}. Include:
- Doctor/clinic names
- Addresses
- Contact numbers (if available)
- Specializations
- Distance from location (if possible)
- Any ratings or reviews (if available)

Format as a structured list with clear information.`;

    const response = await model.invoke([{ 
      role: 'user', 
      content: searchQuery 
    }]);
    
    return {
      success: true,
      location,
      specialization,
      results: response.content || 'No doctors found',
      source: 'gemini-knowledge',
      note: 'For real-time location-based search, consider integrating Google Places API or similar service'
    };
  } catch (error) {
    console.error('❌ [FIND_DOCTORS] Error:', error);
    return {
      success: false,
      location,
      error: error.message || 'Failed to find doctors'
    };
  }
}

export const findDoctorsByLocationTool = new DynamicStructuredTool({
  name: 'findDoctorsByLocation',
  description: `Find doctors, clinics, or hospitals near a specific location. Use this when the user asks for:
- "Find doctors near me"
- "Show me available doctors"
- "Doctors in [location]"
- "Nearest clinic"
- "General doctor near [location]"

This tool searches for healthcare providers based on location and specialization.`,
  schema: z.object({
    location: z.string().describe('Location to search for doctors (e.g., "Mumbai", "Delhi", "near me", "Andheri, Mumbai", or coordinates like "19.0760,72.8777")'),
    specialization: z.string().optional().describe('Type of doctor or specialization (e.g., "general", "cardiologist", "dentist", "pediatrician"). Default: "general"')
  }),
  func: async ({ location, specialization = 'general' }) => {
    console.log('🔍 [FIND_DOCTORS] Searching for doctors:', { location, specialization });
    try {
      const result = await findDoctorsByLocation(location, specialization);
      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ [FIND_DOCTORS] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to find doctors'
      });
    }
  }
});

