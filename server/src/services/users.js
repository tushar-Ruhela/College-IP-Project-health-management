import { User } from '../models/User.js';

/**
 * Get user by phone number
 */
export async function getUserByPhoneNumber(phoneNumber) {
  try {
    // Return a full Mongoose document so callers can safely call .save()
    const user = await User.findOne({ phoneNumber });
    return user || null;
  } catch (error) {
    console.error('Error fetching user by phone number:', error);
    return null;
  }
}

/**
 * Get or create user by phone number
 * If user doesn't exist, creates a basic user record
 */
export async function getOrCreateUser(phoneNumber) {
  try {
    let user = await getUserByPhoneNumber(phoneNumber);
    
    if (!user) {
      // Create a new user with just phone number
      const newUser = new User({
        phoneNumber,
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await newUser.save();
      user = newUser;
      console.log('✅ Created new user:', newUser.toObject());
    }
    
    return user;
  } catch (error) {
    console.error('Error getting or creating user:', error);
    
    // If MongoDB connection fails, return a minimal user object so the call can still proceed
    const fallbackUser = {
      phoneNumber,
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    console.warn('⚠️ Using fallback user (MongoDB unavailable):', fallbackUser);
    return fallbackUser;
  }
}

/**
 * Update user information
 */
export async function updateUser(phoneNumber, updates) {
  try {
    const result = await User.findOneAndUpdate(
      { phoneNumber },
      { 
        ...updates,
        updatedAt: Date.now()
      },
      { upsert: true, new: true }
    );
    return result ? true : false;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

