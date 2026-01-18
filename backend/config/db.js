import mongoose from "mongoose";
import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.sandbox';
dotenv.config({ path: envFile });

// Track connection state
let isConnected = false;
let connectionPromise = null; // Track ongoing connection attempts

const connectDB = async () => { 
  try {
    // If already connected and ready, don't reconnect
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      isConnected = true;
      return;
    }

    // If a connection is already in progress, wait for it
    if (connectionPromise) {
      console.log('MongoDB connection in progress, waiting for existing attempt...');
      await connectionPromise;
      if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
      }
    }

    // If connection is in progress (state 2), wait for it to complete
    if (mongoose.connection.readyState === 2) {
      console.log('MongoDB connection in progress, waiting...');
      // Wait for connection to be ready (max 10 seconds)
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (mongoose.connection.readyState === 1) {
        isConnected = true;
        console.log('MongoDB connection ready');
        return;
      }
    }

    // Set mongoose options for better connection handling
    mongoose.set('strictQuery', false);
    
    // Create a connection promise to prevent multiple simultaneous attempts
    connectionPromise = (async () => {
      // Connect to MongoDB
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        // Essential connection settings only
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      });

      // Wait for connection to be fully ready
      if (mongoose.connection.readyState !== 1) {
        // Wait up to 5 seconds for connection to be ready
        let attempts = 0;
        while (mongoose.connection.readyState !== 1 && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }

      // Verify connection is ready before proceeding
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection not ready after connect attempt');
      }

      isConnected = true;
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })();

    // Wait for the connection to complete
    await connectionPromise;
    
    // Clear the promise after successful connection
    connectionPromise = null;
    
    // Handle connection events (only set once)
    if (!mongoose.connection.listeners('connected').length) {
      mongoose.connection.on('connected', () => {
        console.log('Mongoose connected to MongoDB');
        isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        console.error('Mongoose connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected from MongoDB');
        isConnected = false;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      });
    }

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    isConnected = false;
    connectionPromise = null; // Clear the promise on error
    throw error;
  }
};

// For graceful shutdown only - don't use this in controllers
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      isConnected = false;
      console.log("MongoDB connection closed");
    }
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error.message}`);
    throw error;
  }
};

// Check if database is connected
const isDBConnected = () => {
  // Check the actual mongoose connection state instead of our custom variable
  const connectionState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return connectionState === 1;
};

export { connectDB, disconnectDB, isDBConnected };

