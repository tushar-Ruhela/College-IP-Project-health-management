import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';

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
  createdAt: { type: Number, default: () => Date.now() }
}, { collection: 'medicalknowledge', timestamps: false });

const MedicalKnowledge = mongoose.models.MedicalKnowledge || 
  mongoose.model('MedicalKnowledge', medicalKnowledgeSchema);

/**
 * Search medical knowledge database
 */
async function searchMedicalKnowledge(query) {
  try {
    // Simple keyword search (can be enhanced with vector search if MongoDB Atlas available)
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    const results = await MedicalKnowledge.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { keywords: { $in: searchTerms } }
      ]
    })
      .limit(5)
      .sort({ createdAt: -1 })
      .lean();

    if (results.length === 0) {
      return {
        success: true,
        query,
        results: [],
        message: 'No medical knowledge found in database. Consider adding medical information to the database.',
        note: 'This is a basic keyword search. For better results, consider using MongoDB Atlas Vector Search with embeddings.'
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



