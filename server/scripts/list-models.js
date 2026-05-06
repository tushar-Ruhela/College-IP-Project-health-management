import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Available models supporting embedContent:");
    data.models.forEach(model => {
      if (model.supportedGenerationMethods.includes('embedContent')) {
        console.log(`- ${model.name}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}
listModels();
