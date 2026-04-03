import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

/**
 * Medical Knowledge RAG Tool with Vector Search
 * Uses MongoDB Atlas Vector Search for semantic search
 * Falls back to keyword search if vector search is not available
 */

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

// Initialize embeddings model
let embeddings = null;
if (apiKey) {
  try {
    embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: 'models/embedding-001', // Google's embedding model
      apiKey,
    });
    console.log('✅ [MEDICAL_KNOWLEDGE] Embeddings model initialized');
  } catch (error) {
    console.warn('⚠️ [MEDICAL_KNOWLEDGE] Failed to initialize embeddings:', error.message);
  }
}

// Medical knowledge schema with vector field
const medicalKnowledgeSchema = new mongoose.Schema({
  title: String,
  content: String,
  keywords: [String],
  category: String,
  source: String,
  embedding: {
    type: [Number],
    default: undefined
  },
  createdAt: { type: Number, default: () => Date.now() }
}, { collection: 'medicalknowledge', timestamps: false });

// Create index for vector search (if using MongoDB Atlas)
// This should be done via MongoDB Atlas UI or migration script
// db.medicalknowledge.createSearchIndex({
//   "name": "vector_index",
//   "definition": {
//     "mappings": {
//       "dynamic": true,
//       "fields": {
//         "embedding": {
//           "type": "knnVector",
//           "dimensions": 768,
//           "similarity": "cosine"
//         }
//       }
//     }
//   }
// })

const MedicalKnowledge = mongoose.models.MedicalKnowledge || 
  mongoose.model('MedicalKnowledge', medicalKnowledgeSchema);

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
  if (!embeddings) {
    throw new Error('Embeddings model not initialized. Set GOOGLE_API_KEY.');
  }
  
  try {
    const embedding = await embeddings.embedQuery(text);
    return embedding;
  } catch (error) {
    console.error('❌ [MEDICAL_KNOWLEDGE] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search medical knowledge using vector search (MongoDB Atlas)
 */
async function searchMedicalKnowledgeVector(query) {
  try {
    // Check if we're using MongoDB Atlas (has vector search capability)
    const isAtlas = process.env.MONGODB_URI?.includes('mongodb.net') || 
                    process.env.MONGODB_URI?.includes('atlas');
    
    if (!isAtlas) {
      console.log('⚠️ [MEDICAL_KNOWLEDGE] Not using MongoDB Atlas, falling back to keyword search');
      return await searchMedicalKnowledgeKeyword(query);
    }

    // Generate embedding for query
    if (!embeddings) {
      console.log('⚠️ [MEDICAL_KNOWLEDGE] Embeddings not available, falling back to keyword search');
      return await searchMedicalKnowledgeKeyword(query);
    }

    console.log('🔍 [MEDICAL_KNOWLEDGE] Generating embedding for query...');
    const queryEmbedding = await generateEmbedding(query);

    // MongoDB Atlas Vector Search
    // Note: This requires a search index to be created in MongoDB Atlas
    // The index should be named "vector_index" and map the "embedding" field
    
    const collection = mongoose.connection.db.collection('medicalknowledge');
    
    // Try vector search first
    try {
      const vectorSearchResults = await collection.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 5
          }
        },
        {
          $project: {
            title: 1,
            content: 1,
            category: 1,
            source: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ]).toArray();

      if (vectorSearchResults.length > 0) {
        console.log(`✅ [MEDICAL_KNOWLEDGE] Found ${vectorSearchResults.length} results using vector search`);
        return {
          success: true,
          query,
          method: 'vector_search',
          count: vectorSearchResults.length,
          results: vectorSearchResults.map(r => ({
            title: r.title,
            content: r.content?.substring(0, 500) + (r.content?.length > 500 ? '...' : ''),
            category: r.category,
            source: r.source,
            score: r.score
          }))
        };
      }
    } catch (vectorError) {
      console.warn('⚠️ [MEDICAL_KNOWLEDGE] Vector search failed, falling back to keyword search:', vectorError.message);
      // Fall back to keyword search
    }

    // Fallback to keyword search
    return await searchMedicalKnowledgeKeyword(query);

  } catch (error) {
    console.error('❌ [MEDICAL_KNOWLEDGE] Error in vector search:', error);
    // Fallback to keyword search
    return await searchMedicalKnowledgeKeyword(query);
  }
}

/**
 * Keyword-based search (fallback)
 */
async function searchMedicalKnowledgeKeyword(query) {
  try {
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
        method: 'keyword_search',
        results: [],
        message: 'No medical knowledge found in database. Consider adding medical information to the database.',
        note: 'This is a basic keyword search. For better results, set up MongoDB Atlas Vector Search with embeddings.'
      };
    }

    return {
      success: true,
      query,
      method: 'keyword_search',
      count: results.length,
      results: results.map(r => ({
        title: r.title,
        content: r.content?.substring(0, 500) + (r.content?.length > 500 ? '...' : ''),
        category: r.category,
        source: r.source
      }))
    };
  } catch (error) {
    console.error('❌ [MEDICAL_KNOWLEDGE] Error in keyword search:', error);
    return {
      success: false,
      query,
      method: 'keyword_search',
      error: error.message || 'Medical knowledge search failed',
      note: 'Database may not be initialized. Consider populating the MedicalKnowledge collection.'
    };
  }
}

/**
 * Add medical knowledge with automatic embedding generation
 */
export async function addMedicalKnowledge(title, content, category = 'general', source = 'system', keywords = []) {
  try {
    if (!embeddings) {
      console.warn('⚠️ [MEDICAL_KNOWLEDGE] Embeddings not available, saving without embedding');
      const doc = new MedicalKnowledge({
        title,
        content,
        category,
        source,
        keywords
      });
      await doc.save();
      return { success: true, id: doc._id };
    }

    // Generate embedding for the content
    const textToEmbed = `${title} ${content} ${keywords.join(' ')}`;
    const embedding = await generateEmbedding(textToEmbed);

    const doc = new MedicalKnowledge({
      title,
      content,
      category,
      source,
      keywords,
      embedding
    });

    await doc.save();
    console.log('✅ [MEDICAL_KNOWLEDGE] Added medical knowledge with embedding');
    return { success: true, id: doc._id };
  } catch (error) {
    console.error('❌ [MEDICAL_KNOWLEDGE] Error adding medical knowledge:', error);
    throw error;
  }
}

export const medicalKnowledgeVectorTool = new DynamicStructuredTool({
  name: 'searchMedicalKnowledge',
  description: `Search the medical knowledge database for information about symptoms, conditions, treatments, medications, or health advice using semantic vector search.
Use this when the user asks about:
- Medical conditions or diseases
- Symptoms and their meanings
- Treatment options
- Medication information
- Health advice or recommendations
- Medical procedures

This searches a curated medical knowledge base using vector embeddings for better semantic understanding. Falls back to keyword search if vector search is not available.`,
  schema: z.object({
    query: z.string().describe('The medical query to search for (e.g., "diabetes symptoms", "hypertension treatment", "common cold remedies")')
  }),
  func: async ({ query }) => {
    console.log('🏥 [MEDICAL_KNOWLEDGE] Searching for:', query);
    try {
      const result = await searchMedicalKnowledgeVector(query);
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

