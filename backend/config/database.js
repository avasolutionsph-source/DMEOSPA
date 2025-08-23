// Unified Database Configuration
// Consolidates database connections from all three backends

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let connection = null;

/**
 * MongoDB connection options
 */
const getConnectionOptions = () => ({
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: process.env.DB_POOL_SIZE || 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4
});

/**
 * Get MongoDB URI with fallback
 */
const getMongoUri = () => {
  return process.env.MONGODB_URI || 
         process.env.DATABASE_URL || 
         'mongodb://localhost:27017/ava-solutions';
};

/**
 * Connect to MongoDB with retry logic
 */
export const connectDB = async (retries = 5) => {
  const mongoUri = getMongoUri();
  
  // Mask password in URI for logging
  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  
  for (let i = 0; i < retries; i++) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${i + 1}/${retries})...`, {
        uri: maskedUri
      });
      
      connection = await mongoose.connect(mongoUri, getConnectionOptions());
      
      logger.info('MongoDB connected successfully', {
        host: connection.connection.host,
        port: connection.connection.port,
        database: connection.connection.name,
        readyState: connection.connection.readyState
      });
      
      // Setup connection event handlers
      setupEventHandlers();
      
      return connection;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${i + 1} failed:`, {
        error: error.message,
        code: error.code
      });
      
      if (i === retries - 1) {
        throw new Error(`Failed to connect to MongoDB after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      logger.info(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Setup MongoDB event handlers
 */
const setupEventHandlers = () => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });
  
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error:', {
      error: error.message,
      code: error.code
    });
  });
  
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
  
  mongoose.connection.on('close', () => {
    logger.info('MongoDB connection closed');
  });
  
  // Monitor slow queries
  if (process.env.LOG_SLOW_QUERIES === 'true') {
    mongoose.set('debug', (collectionName, methodName, ...args) => {
      const query = args[0];
      const queryStr = JSON.stringify(query).substring(0, 200);
      logger.debug(`MongoDB Query: ${collectionName}.${methodName}`, {
        collection: collectionName,
        method: methodName,
        query: queryStr
      });
    });
  }
};

/**
 * Get database connection
 */
export const getDBConnection = () => {
  if (!connection) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return connection;
};

/**
 * Check database health
 */
export const checkDBHealth = async () => {
  try {
    if (!mongoose.connection.readyState === 1) {
      throw new Error('Database not connected');
    }
    
    // Ping database
    await mongoose.connection.db.admin().ping();
    
    // Get database stats
    const stats = await mongoose.connection.db.stats();
    
    return {
      status: 'healthy',
      connected: true,
      database: mongoose.connection.name,
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      avgObjSize: stats.avgObjSize,
      readyState: mongoose.connection.readyState
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message
    };
  }
};

/**
 * Close database connection
 */
export const closeDB = async () => {
  try {
    if (connection) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      connection = null;
    }
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Create database indexes
 */
export const createIndexes = async () => {
  logger.info('Creating database indexes...');
  
  try {
    // Import all models to ensure indexes are created
    const models = await import('../models/index.js');
    
    for (const [modelName, model] of Object.entries(models.default)) {
      if (model.createIndexes) {
        await model.createIndexes();
        logger.debug(`Indexes created for ${modelName}`);
      }
    }
    
    logger.info('All database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
};

/**
 * Seed database with initial data
 */
export const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Skipping database seeding in production');
    return;
  }
  
  logger.info('Seeding database...');
  
  try {
    const seeder = await import('./seeder.js');
    await seeder.default();
    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

/**
 * Database transaction helper
 */
export const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Mongoose plugins
 */

// Soft delete plugin
export const softDeletePlugin = (schema) => {
  schema.add({
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  });
  
  schema.pre(/^find/, function() {
    if (!this.options.includeDeleted) {
      this.where({ deleted: { $ne: true } });
    }
  });
  
  schema.methods.softDelete = function() {
    this.deleted = true;
    this.deletedAt = new Date();
    return this.save();
  };
  
  schema.methods.restore = function() {
    this.deleted = false;
    this.deletedAt = undefined;
    return this.save();
  };
};

// Timestamp plugin (if not using mongoose timestamps)
export const timestampPlugin = (schema) => {
  schema.add({
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
  schema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
  });
};

// Audit trail plugin
export const auditPlugin = (schema) => {
  schema.add({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 0 }
  });
  
  schema.pre('save', function(next) {
    if (this.isNew) {
      this.version = 0;
    } else {
      this.version++;
    }
    next();
  });
};

export default {
  connectDB,
  getDBConnection,
  checkDBHealth,
  closeDB,
  createIndexes,
  seedDatabase,
  withTransaction,
  softDeletePlugin,
  timestampPlugin,
  auditPlugin
};