/**
 * User Service
 * Handles user lookup and management
 */

import { getDatabase } from './mongodb';

export interface User {
  _id?: string;
  phoneNumber: string;
  userId?: string;
  name?: string;
  email?: string;
  metadata?: {
    preferredLanguage?: 'en' | 'hi';
    location?: string;
    timezone?: string;
    [key: string]: any;
  };
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Get user by phone number
 */
export async function getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ phoneNumber });
    return user as User | null;
  } catch (error) {
    console.error('Error fetching user by phone number:', error);
    return null;
  }
}

/**
 * Get or create user by phone number
 * If user doesn't exist, creates a basic user record
 */
export async function getOrCreateUser(phoneNumber: string): Promise<User> {
  try {
    let user = await getUserByPhoneNumber(phoneNumber);
    
    if (!user) {
      // Create a new user with just phone number
      const db = await getDatabase();
      const usersCollection = db.collection('users');
      const newUser: User = {
        phoneNumber,
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const result = await usersCollection.insertOne(newUser as any);
      user = { ...newUser, _id: result.insertedId.toString() };
      console.log('✅ Created new user:', user);
    }
    
    return user;
  } catch (error) {
    console.error('Error getting or creating user:', error);
    
    // If MongoDB connection fails, return a minimal user object so the call can still proceed
    // This is a graceful fallback - the call will work but user won't be saved to DB
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
export async function updateUser(phoneNumber: string, updates: Partial<User>): Promise<boolean> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { phoneNumber },
      { 
        $set: { 
          ...updates,
          updatedAt: Date.now()
        } 
      },
      { upsert: true }
    );
    return result.modifiedCount > 0 || result.upsertedCount > 0;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

