import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Use environment variable for MongoDB connection string
const uri = process.env.MONGODB_URI;
console.log('🔑 MongoDB URI:', uri);
// Connection status
let isConnected = false;
let connectionStatus = 'disconnected'; // 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Get database connection status
 */
export function getConnectionStatus() {
  return {
    isConnected,
    status: connectionStatus,
    readyState: mongoose.connection.readyState, // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };
}

/**
 * Connect to MongoDB using Mongoose
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected');
    isConnected = true;
    connectionStatus = 'connected';
    return;
  }

  console.log('🔑 MongoDB URI:', uri);
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    connectionStatus = 'connecting';
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Increased from 5s to 10s
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    });

    isConnected = true;
    connectionStatus = 'connected';
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
    
    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      isConnected = true;
      connectionStatus = 'connected';
      console.log('✅ MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      connectionStatus = 'error';
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      connectionStatus = 'disconnected';
      console.warn('⚠️ MongoDB disconnected');
      // Attempt to reconnect after a delay
      setTimeout(async () => {
        if (mongoose.connection.readyState === 0) {
          try {
            console.log('🔄 Attempting to reconnect to MongoDB...');
            await mongoose.connect(uri, {
              serverSelectionTimeoutMS: 10000,
              socketTimeoutMS: 45000,
              connectTimeoutMS: 10000,
              maxPoolSize: 10,
              minPoolSize: 2,
              retryWrites: true,
              retryReads: true,
            });
          } catch (error) {
            console.error('❌ Reconnection failed:', error.message);
          }
        }
      }, 5000); // Retry after 5 seconds
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    isConnected = false;
    connectionStatus = 'error';
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    isConnected = false;
    connectionStatus = 'disconnected';
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

export default mongoose;

