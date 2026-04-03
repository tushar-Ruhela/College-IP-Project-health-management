import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * MediScan Tool
 * Exact copy of Saral_Pro implementation, adapted for base64 images
 */

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAi_U9j7785UhNCBW20rHB-DHcLYhWbvjc';

async function scanMedicine(imageData, language = 'en') {
  try {
    // Extract base64 data and mime type
    let base64Data;
    let mimeType = 'image/jpeg';
    
    if (typeof imageData === 'string') {
      if (imageData.startsWith('data:image')) {
        const parts = imageData.split(',');
        const header = parts[0];
        base64Data = parts[1] || imageData;
        const mimeMatch = header.match(/data:image\/([^;]+)/);
        if (mimeMatch) {
          mimeType = `image/${mimeMatch[1]}`;
        }
      } else if (imageData.startsWith('/9j/') || imageData.startsWith('iVBORw0KGgo')) {
        base64Data = imageData;
        mimeType = imageData.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
      } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        const response = await fetch(imageData);
        const arrayBuffer = await response.arrayBuffer();
        base64Data = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          mimeType = contentType;
        }
      } else {
        base64Data = imageData;
      }
    } else {
      base64Data = imageData.data;
      mimeType = imageData.mimeType || 'image/jpeg';
    }

    // Exact copy of Saral_Pro initialization
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Prompt to extract structured medicine information
    const prompt = `
You are a medical assistant specialized in reading medicine labels and packaging. Analyze this medicine image and extract the following information in JSON format:

{
  "medicineName": "exact name of the medicine as written on the package",
  "genericName": "generic/active ingredient name if visible, or null",
  "manufacturer": "manufacturer name if visible, or null",
  "expiryDate": "expiry date in format YYYY-MM-DD if visible, or null if not found",
  "batchNumber": "batch/lot number if visible, or null",
  "purpose": "what this medicine is used for (indication/purpose)",
  "dosage": "dosage information if visible (e.g., '500mg', '10ml'), or null",
  "form": "form of medicine (tablet, capsule, syrup, injection, etc.), or null",
  "warnings": "any warnings or precautions visible on the package, or null"
}

**IMPORTANT INSTRUCTIONS:**
1. Extract the expiry date in YYYY-MM-DD format if visible (e.g., "2025-12-31")
2. If expiry date is in a different format, convert it to YYYY-MM-DD
3. If expiry date is not visible, set it to null
4. Extract medicine name exactly as written (preserve original language if not English)
5. Identify the purpose/indication from the label text
6. If any field is not visible, set it to null (not empty string)
7. Return ONLY valid JSON, no additional text or markdown formatting
`;

    // Generate content with Gemini
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        },
      },
    ]);

    // Extract text from response
    const generatedText = await result.response.text();

    // Try to parse JSON from response
    let medicineData;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
      medicineData = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON parsing fails, create structured response from text
      console.warn('⚠️ [MEDISCAN] Failed to parse JSON, creating structured response');
      medicineData = {
        medicineName: 'Could not extract',
        genericName: null,
        manufacturer: null,
        expiryDate: null,
        batchNumber: null,
        purpose: generatedText.substring(0, 200) || 'Could not determine from image',
        dosage: null,
        form: null,
        warnings: null,
        rawResponse: generatedText
      };
    }

    // Validate and format expiry date
    if (medicineData.expiryDate) {
      try {
        const date = new Date(medicineData.expiryDate);
        if (!isNaN(date.getTime())) {
          medicineData.expiryDate = date.toISOString().split('T')[0];
        }
      } catch (e) {
        medicineData.expiryDate = null;
      }
    }

    // Check if expiry date is in the past
    let expiryStatus = 'unknown';
    if (medicineData.expiryDate) {
      const expiry = new Date(medicineData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiry < today) {
        expiryStatus = 'expired';
      } else {
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
          expiryStatus = 'expiring_soon';
        } else {
          expiryStatus = 'valid';
        }
      }
    }

    // Return in the format expected by frontend
    return {
      success: true,
      medicine: {
        ...medicineData,
        expiryStatus,
        scannedAt: new Date().toISOString()
      },
      data: generatedText, // Also include raw text for compatibility
      note: 'This information is extracted from the medicine package. Always verify with a healthcare professional before use.'
    };

  } catch (error) {
    console.error('❌ [MEDISCAN] Error:', error);
    return {
      success: false,
      error: error.message || 'Medicine scanning failed',
      note: 'Make sure the image is clear and shows the medicine package label. Supported formats: JPEG, PNG.'
    };
  }
}

export const mediscanTool = new DynamicStructuredTool({
  name: 'scanMedicine',
  description: `Scan a medicine package image to extract medicine name, expiry date, purpose, dosage, and other details. Supports 25+ languages.`,
  schema: z.object({
    imageUrl: z.string().describe('The medicine package image - can be a base64-encoded image (data:image/...), a URL (http://... or https://...), or a file path'),
    language: z.string().optional().describe('Preferred language for response (default: en). Supports: en, hi, ta, te, kn, ml, mr, gu, bn, or, pa, ur, and more.')
  }),
  func: async ({ imageUrl, language }) => {
    try {
      const result = await scanMedicine(imageUrl, language || 'en');
      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ [MEDISCAN] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Medicine scanning failed'
      });
    }
  }
});
