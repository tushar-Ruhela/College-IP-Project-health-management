import { Router } from 'express';
import { mediscanTool } from '../services/tools/mediscan.js';
import { getOrCreateUser } from '../services/users.js';

const router = Router();

/**
 * POST /api/mediscan
 * Scan medicine package image
 * 
 * Request body:
 * {
 *   imageUrl: string,  // Base64 image data or URL
 *   language?: string, // Optional, default: 'en'
 *   phoneNumber?: string // Optional, for user context
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { imageUrl, language, phoneNumber } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required'
      });
    }

    console.log('💊 [MEDISCAN] Received scan request');
    console.log('📸 [MEDISCAN] Image format:', imageUrl.substring(0, 50) + '...');
    console.log('🌐 [MEDISCAN] Language:', language || 'en');

    // Get user context if phoneNumber provided
    let user = null;
    if (phoneNumber) {
      try {
        user = await getOrCreateUser(phoneNumber);
        console.log('✅ [MEDISCAN] User context loaded:', { userId: user.userId, name: user.name });
      } catch (error) {
        console.warn('⚠️ [MEDISCAN] Could not load user context:', error.message);
      }
    }

    // Use the preferred language from user metadata if available
    const preferredLanguage = user?.metadata?.preferredLanguage || language || 'en';

    // Call the mediscan tool
    console.log('🔍 [MEDISCAN] Scanning medicine image...');
    console.log('⏱️ [MEDISCAN] Starting scan at:', new Date().toISOString());
    
    // Add timeout wrapper
    const scanPromise = mediscanTool.func({
      imageUrl,
      language: preferredLanguage
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Scan timeout: Request took longer than 30 seconds'));
      }, 30000); // 30 second timeout
    });
    
    const result = await Promise.race([scanPromise, timeoutPromise]);
    console.log('⏱️ [MEDISCAN] Scan completed at:', new Date().toISOString());

    // Parse the result
    let scanResult;
    try {
      scanResult = JSON.parse(result);
    } catch (parseError) {
      console.error('❌ [MEDISCAN] Failed to parse result:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse scan result'
      });
    }

    console.log('✅ [MEDISCAN] Scan completed:', scanResult.success ? 'Success' : 'Failed');

    // If successful, optionally create a medical record for the medicine
    if (scanResult.success && scanResult.medicine && phoneNumber && user) {
      try {
        // You could create a medical record here if needed
        // For now, we'll just return the result
        console.log('💾 [MEDISCAN] Medicine scanned successfully for user:', phoneNumber);
      } catch (error) {
        console.warn('⚠️ [MEDISCAN] Could not save medicine record:', error.message);
      }
    }

    res.json({
      success: scanResult.success !== false,
      ...scanResult
    });

  } catch (error) {
    console.error('❌ [MEDISCAN] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan medicine'
    });
  }
});

export default router;

