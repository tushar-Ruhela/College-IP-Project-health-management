import { Router } from 'express';
import { getUserByPhoneNumber, getOrCreateUser, updateUser } from '../services/users.js';

const router = Router();

/**
 * GET /api/users/check/:phoneNumber
 * Check if a user exists by phone number
 */
router.get('/check/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const user = await getUserByPhoneNumber(phoneNumber);
    
    res.json({
      success: true,
      exists: !!user,
      user: user || null
    });
  } catch (error) {
    console.error('❌ [USERS] Error checking user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check user'
    });
  }
});

/**
 * POST /api/users/create
 * Create a new user
 */
router.post('/create', async (req, res) => {
  try {
    const { phoneNumber, name, age } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Get or create user
    const user = await getOrCreateUser(phoneNumber);
    
    // Update with name and age if provided
    if (name || age) {
      await updateUser(phoneNumber, {
        name,
        ...(age && { metadata: { ...user.metadata, age: parseInt(age) } })
      });
      
      // Fetch updated user
      const updatedUser = await getUserByPhoneNumber(phoneNumber);
      return res.json({
        success: true,
        user: updatedUser
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ [USERS] Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create user'
    });
  }
});

export default router;



