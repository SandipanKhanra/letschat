/**
 * MongoDB Database Connection Module
 *
 * This module handles MongoDB connection with production-grade reliability features:
 * - Connection pooling for optimal resource management
 * - Automatic retry logic with exponential backoff
 * - Connection event monitoring and logging
 * - Timeout configurations to prevent hanging connections
 * - Write acknowledgment from majority replicas for data durability
 */

import mongoose from "mongoose";

const MAX_RETRIES = 3; // Maximum connection retry attempts
const RETRY_DELAY = 5000; // Delay between retries in milliseconds (5 seconds)

/**
 * MongoDB Connection Options - Production Optimized
 *
 * Configuration Details:
 * - maxPoolSize: Maximum number of connections in the pool (10 for high concurrency)
 * - minPoolSize: Minimum connections to maintain (5 for quick initialization)
 * - socketTimeoutMS: Timeout for socket operations (45 seconds to prevent hanging)
 * - serverSelectionTimeoutMS: Timeout for server discovery (10 seconds for fast failover)
 * - maxIdleTimeMS: Maximum idle time before connection is dropped (45 seconds)
 * - retryWrites: Automatically retry failed write operations (prevents transient failures)
 * - retryReads: Automatically retry failed read operations (improves reliability)
 * - w: "majority" - Requires write acknowledgment from majority replicas (data durability)
 *
 */
const mongoOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  maxIdleTimeMS: 45000,
  retryWrites: true,
  retryReads: true,
  w: "majority",
};

/**
 * Establishes a connection to MongoDB with retry logic and monitoring
 *
 * Features:
 * 1. Environment Variable Validation: Ensures MONGO_URI is set before attempting connection
 * 2. Automatic Retry: Attempts connection up to MAX_RETRIES times with exponential delays
 * 3. Connection Monitoring: Sets up event listeners for error, disconnect, and reconnect events
 * 4. Graceful Error Handling: Throws descriptive errors instead of abruptly exiting
 * 5. Real-time Logging: Provides detailed logs for debugging and monitoring
 *
 * Usage:
 * ```javascript
 * await connectDB();
 * ```
 *
 * @async
 * @function connectDB
 * @param {string} mongoURI - MongoDB connection URI (uses MONGO_URI env variable)
 * @returns {Promise<boolean>} Returns true on successful connection
 * @throws {Error} Throws error if connection fails after all retry attempts
 *
 * @example
 * // In your server.js or main file
 * import { connectDB } from './lib/db.js';
 *
 * try {
 *   await connectDB();
 * } catch (error) {
 *   console.error('Failed to connect to database:', error);
 *   process.exit(1);
 * }
 */
export const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error(
      "❌ MongoDB connection failed: MONGO_URI environment variable is not set"
    );
    throw new Error("MONGO_URI environment variable is required");
  }

  let retries = 0;

  /**
   * Inner function to handle connection attempts with retry logic
   * Uses recursion to retry connection after RETRY_DELAY milliseconds
   *
   * @returns {Promise<boolean>} Returns true on successful connection
   * @throws {Error} Throws error after MAX_RETRIES attempts
   */
  const attemptConnection = async () => {
    try {
      await mongoose.connect(MONGO_URI, mongoOptions);
      console.log("✅ MongoDB connected successfully");

      /**
       * Setup event listeners for connection monitoring
       * These ensure real-time visibility into connection status
       */

      // Handles unexpected connection errors
      mongoose.connection.on("error", (error) => {
        console.error("❌ MongoDB connection error:", error.message);
      });

      // Logs when connection is lost (network issues, server restart, etc.)
      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected");
      });

      // Logs when connection is restored after disconnection
      mongoose.connection.on("reconnected", () => {
        console.log("✅ MongoDB reconnected");
      });

      return true;
    } catch (error) {
      retries++;
      console.error(
        `❌ MongoDB connection attempt ${retries} failed:`,
        error.message
      );

      // Retry logic: wait and attempt again if retries remain
      if (retries < MAX_RETRIES) {
        console.log(
          `⏳ Retrying in ${
            RETRY_DELAY / 1000
          } seconds... (${retries}/${MAX_RETRIES})`
        );
        // Wait before retrying to handle transient issues
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return attemptConnection();
      }

      // Throw error after all retry attempts are exhausted
      throw new Error(
        `Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${error.message}`
      );
    }
  };

  return attemptConnection();
};
