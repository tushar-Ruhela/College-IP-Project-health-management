import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

/**
 * Medical Knowledge RAG Tool
 * Searches a MongoDB collection for medical knowledge
 * 
 * Note: This requires a 'MedicalKnowledge' collection to be populated
 * For now, we'll create a simple keyword-based search
 */

// Simple medical knowledge schema (can be expanded)
const medicalKnowledgeSchema = new mongoose.Schema({
  title: String,
  content: String,
  keywords: [String],
  category: String,
  source: String,
  embedding: [Number],
  createdAt: { type: Number, default: () => Date.now() }
}, { collection: 'medicalknowledge', timestamps: false });

const MedicalKnowledge = mongoose.models.MedicalKnowledge || 
  mongoose.model('MedicalKnowledge', medicalKnowledgeSchema);

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search medical knowledge database
 */
async function searchMedicalKnowledge(query) {
  try {
    const searchTerms = query.toLowerCase().split(/\s+/);
    let results = [];
    
    try {
      // Try semantic search first
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
        modelName: 'gemini-embedding-2'
      });
      
      const queryEmbedding = await embeddings.embedQuery(query);
      const allDocs = await MedicalKnowledge.find({}).lean();
      
      if (allDocs.length > 0 && allDocs[0].embedding) {
        // Compute similarity scores in memory
        const scoredDocs = allDocs.map(doc => {
          const score = doc.embedding ? cosineSimilarity(queryEmbedding, doc.embedding) : 0;
          return { ...doc, score };
        });
        
        // Sort by score and take top 5
        scoredDocs.sort((a, b) => b.score - a.score);
        results = scoredDocs.slice(0, 5).filter(d => d.score > 0.5);
      }
    } catch (e) {
      console.warn('Semantic search failed, falling back to keyword search:', e.message);
    }
    
    // Fallback to keyword search if semantic search yields no results
    if (results.length === 0) {
      results = await MedicalKnowledge.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { keywords: { $in: searchTerms } }
        ]
      })
        .limit(5)
        .sort({ createdAt: -1 })
        .lean();
    }

    if (results.length === 0) {
      return {
        success: true,
        query,
        results: [],
        message: 'No local medical knowledge found. You MUST use your own built-in medical knowledge to answer the user safely and helpfully. Do not say you could not find information.',
        note: 'Fallback to your general knowledge.'
      };
    }

    return {
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        title: r.title,
        content: r.content?.substring(0, 500) + (r.content?.length > 500 ? '...' : ''),
        category: r.category,
        source: r.source
      }))
    };
  } catch (error) {
    console.error('❌ [MEDICAL_KNOWLEDGE] Error:', error);
    return {
      success: false,
      query,
      error: error.message || 'Medical knowledge search failed',
      note: 'Database may not be initialized. Consider populating the MedicalKnowledge collection.'
    };
  }
}

export const medicalKnowledgeTool = new DynamicStructuredTool({
  name: 'searchMedicalKnowledge',
  description: `Search the medical knowledge database for information about symptoms, conditions, treatments, medications, or health advice.
Use this when the user asks about:
- Medical conditions or diseases
- Symptoms and their meanings
- Treatment options
- Medication information
- Health advice or recommendations
- Medical procedures

This searches a curated medical knowledge base. For general health information, use webSearch instead.`,
  schema: z.object({
    query: z.string().describe('The medical query to search for (e.g., "diabetes symptoms", "hypertension treatment", "common cold remedies")')
  }),
  func: async ({ query }) => {
    console.log('🏥 [MEDICAL_KNOWLEDGE] Searching for:', query);
    try {
      const result = await searchMedicalKnowledge(query);
      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ [MEDICAL_KNOWLEDGE] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Medical knowledge search failed'
      });
    }
  }
});



