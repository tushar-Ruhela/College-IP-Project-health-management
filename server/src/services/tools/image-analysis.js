import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

/**
 * Image Analysis Tool
 * Uses Gemini's vision capabilities to analyze health-related images
 */

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Analyze a health-related image using Gemini Vision
 */
async function analyzeHealthImage(imageData, description) {
  try {
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY must be set');
    }

    // Use Gemini Vision model
    const model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-1.5-pro', // or 'gemini-1.5-flash' for faster responses
      temperature: 0.3,
      maxOutputTokens: 1024,
      apiKey,
    });

    // Prepare the prompt for health image analysis
    const analysisPrompt = `You are a medical assistant analyzing a health-related image. 

User description: ${description || 'No description provided'}

Please analyze this image and provide:
1. What you can observe in the image (visible symptoms, conditions, or health indicators)
2. Potential health concerns (if any)
3. Recommendations (when to see a doctor, general advice)
4. Important disclaimers about not replacing professional medical advice

Be specific but cautious. Always emphasize that this is not a substitute for professional medical diagnosis.

Format your response clearly with sections.`;

    // Handle different image input formats
    let imageInput;
    if (typeof imageData === 'string') {
      // Could be base64, URL, or file path
      if (imageData.startsWith('data:image') || imageData.startsWith('/9j/') || imageData.startsWith('iVBORw0KGgo')) {
        // Base64 image
        imageInput = {
          mimeType: imageData.includes('data:image') 
            ? imageData.split(';')[0].split(':')[1] 
            : 'image/jpeg', // Default
          data: imageData.includes(',') ? imageData.split(',')[1] : imageData
        };
      } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        // URL - Gemini can handle URLs directly
        imageInput = imageData;
      } else {
        throw new Error('Unsupported image format. Please provide base64 data or URL.');
      }
    } else {
      imageInput = imageData;
    }

    // Invoke model with image
    // Gemini uses HumanMessage with content array format
    let imageContent;
    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        // URL format for Gemini
        imageContent = {
          type: 'image_url',
          image_url: imageInput
        };
      } else {
        // Base64 format
        imageContent = {
          type: 'image_url',
          image_url: `data:${imageInput.includes('data:') ? '' : 'image/jpeg;'}base64,${imageInput.includes(',') ? imageInput.split(',')[1] : imageInput}`
        };
      }
    } else {
      // Object format
      imageContent = {
        type: 'image_url',
        image_url: `data:${imageInput.mimeType};base64,${imageInput.data}`
      };
    }

    const messages = [
      new HumanMessage({
        content: [
          { type: 'text', text: analysisPrompt },
          imageContent
        ]
      })
    ];

    const response = await model.invoke(messages);
    
    return {
      success: true,
      analysis: response.content || 'Could not analyze image',
      description: description || 'No description provided',
      note: 'This analysis is for informational purposes only and does not replace professional medical advice.'
    };
  } catch (error) {
    console.error('❌ [IMAGE_ANALYSIS] Error:', error);
    return {
      success: false,
      error: error.message || 'Image analysis failed',
      note: 'Make sure the image is in a supported format (JPEG, PNG) and the Gemini API key is valid.'
    };
  }
}

export const imageAnalysisTool = new DynamicStructuredTool({
  name: 'analyzeHealthImage',
  description: `Analyze a health-related image (symptom photos, rashes, wounds, medical documents, etc.) using AI vision capabilities.
Use this when the user:
- Shares an image of a symptom (rash, wound, skin condition)
- Shows a medical document or prescription
- Wants to know what's visible in a health-related photo
- Asks about something visible in an image

Important: Always remind the user that this is not a substitute for professional medical diagnosis.`,
  schema: z.object({
    imageUrl: z.string().describe('The image to analyze - can be a base64-encoded image (data:image/...), a URL (http://... or https://...), or a file path'),
    description: z.string().optional().describe('Optional description of what the user wants to know about the image (e.g., "rash on arm", "prescription label", "wound on leg")')
  }),
  func: async ({ imageUrl, description }) => {
    console.log('🖼️ [IMAGE_ANALYSIS] Analyzing image:', description || 'No description');
    try {
      const result = await analyzeHealthImage(imageUrl, description);
      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ [IMAGE_ANALYSIS] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Image analysis failed'
      });
    }
  }
});

