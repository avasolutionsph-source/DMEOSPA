// Unified Backend Server for Ava Solutions
// Consolidates marketing-website, pwa-backend, and redirect backend into one cohesive system

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Import unified utilities and middleware
import { connectDB, getDBConnection } from './config/database.js';
import logger from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupPassport } from './config/passport.js';

// Import consolidated routers
import apiRouter from './routes/api/index.js';
import marketingRouter from './routes/marketing/index.js';
import adminRouter from './routes/admin/index.js';

// Debug: Check if admin router loaded successfully
console.log('Admin router loaded:', !!adminRouter, typeof adminRouter);
if (!adminRouter) {
  console.error('CRITICAL: Admin router is undefined! Check admin/index.js export');
}
import syncRouter from './routes/sync/index.js';
import realtimeRouter from './routes/realtime/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time updates (StateManager integration)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Store io instance for use in routes
app.set('io', io);

// Connect to MongoDB with retry logic
await connectDB();

// ============================================
// MIDDLEWARE STACK (Order matters!)
// ============================================

// 1. Request logging (first to capture all requests)
app.use(requestLogger);

// 2. Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 3. Compression
app.use(compression());

// 4. CORS Configuration (unified for all frontends)
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      'http://localhost:4000',
      'https://ava-solutions-marketing.netlify.app',
      'https://ava-solutions-pwa.netlify.app'
    ];
    
    // Add environment-specific origins
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      logger.info('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Log origin for debugging
    logger.info(`CORS: Checking origin: ${origin}`);
    
    // Check exact match or pattern match for Netlify/Render domains
    if (allowedOrigins.includes(origin) || 
        /netlify\.app$/.test(origin) || 
        /onrender\.com$/.test(origin)) {
      logger.info(`CORS: Allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    logger.warn(`CORS rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200 // Support legacy browsers
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  logger.info(`CORS preflight request from: ${req.headers.origin}`);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, x-user-id');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// 5. Rate limiting (different limits for different endpoints)
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(429).json({ error: message });
  }
});

// Apply different rate limits to different routes
app.use('/api/auth', createRateLimiter(15 * 60 * 1000, 50, 'Too many authentication attempts'));
app.use('/api/sync', createRateLimiter(1 * 60 * 1000, 100, 'Too many sync requests'));
app.use('/api', createRateLimiter(15 * 60 * 1000, 500, 'Too many API requests'));
app.use('/admin', createRateLimiter(15 * 60 * 1000, 100, 'Too many admin requests'));

// 6. Body parsing
app.use(express.json({ 
  limit: '10mb', // Increased for sync operations
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 7. Session management (with MongoDB store)
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/ava-solutions',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
};

app.use(session(sessionConfig));

// 8. Passport authentication
const passport = setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// 9. Morgan HTTP logging (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ============================================
// STATIC FILE SERVING
// ============================================

// Serve marketing website static files
app.use('/marketing', express.static(path.join(__dirname, '../marketing-website/public')));

// Marketing website routes (static serving) - MUST come before API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/pricing.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/features.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/register.html'));
});

app.get('/business-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/business-dashboard.html'));
});

// Admin page route - MUST come before /admin API router
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../marketing-website/public/admin.html'));
});

// Serve PWA static files
app.use('/pwa', express.static(path.join(__dirname, '../public')));

// Serve admin dashboard (if exists)
app.use('/admin/dashboard', express.static(path.join(__dirname, '../admin-dashboard/build')));

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Ava Solutions Unified Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    api_version: 'v1',
    backend_version: process.env.npm_package_version || '1.0.0',
    features: {
      auth: true,
      sync: true,
      realtime: true,
      admin: true,
      marketing: true
    }
  });
});

// Direct admin routes in server.js (bypass router mounting issues)
app.get('/api/admin', (req, res) => {
  res.json({ 
    message: 'Admin API - Direct Routes',
    version: '1.0.0',
    status: 'available',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/test', (req, res) => {
  res.json({ message: 'Direct admin test route working', timestamp: new Date().toISOString() });
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    // Import User model
    const User = (await import('./models/User.js')).default;
    
    // Get actual user statistics from database
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      subscriptionStatus: 'active'
    });
    
    // Get plan distribution
    const planDistribution = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          plan: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Calculate total revenue (mock calculation for now)
    const totalRevenue = await User.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: '$businessMetrics.totalSales' }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalRevenue: totalRevenue[0]?.revenue || 0,
        planDistribution
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    // Import User model
    const User = (await import('./models/User.js')).default;
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await User.countDocuments();
    
    // Fetch users with pagination (exclude password field)
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Format users for admin panel
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      businessName: user.businessName,
      phone: user.phone || '',
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      createdAt: user.createdAt,
      lastActiveDate: user.businessMetrics?.lastActiveDate || user.createdAt,
      totalSales: user.businessMetrics?.totalSales || 0,
      totalTransactions: user.businessMetrics?.totalTransactions || 0,
      totalEmployees: user.employees?.length || 0,
      totalProducts: user.inventory?.length || 0
    }));
    
    res.json({
      success: true,
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Mount routers with clear separation
app.use('/api', apiRouter);           // Main API endpoints for PWA
app.use('/api/sync', syncRouter);     // Sync endpoints for PWA data
app.use('/api/realtime', realtimeRouter); // Real-time updates via Socket.IO

// Admin router mounting disabled - using direct routes above
// try {
//   if (adminRouter) {
//     app.use('/api/admin', adminRouter);   // Admin API endpoints
//     console.log('✅ Admin router mounted successfully at /api/admin');
//   } else {
//     console.error('❌ Admin router is undefined, cannot mount');
//   }
// } catch (error) {
//   console.error('❌ Error mounting admin router:', error);
// }

app.use('/marketing', marketingRouter); // Marketing website specific endpoints

// ============================================
// SOCKET.IO REAL-TIME EVENTS
// ============================================

// StateManager integration for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Join user-specific room for targeted updates
  socket.on('authenticate', async (token) => {
    try {
      const userId = await verifyToken(token);
      if (userId) {
        socket.join(`user:${userId}`);
        socket.userId = userId;
        socket.emit('authenticated', { userId });
        logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      }
    } catch (error) {
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });
  
  // Handle state synchronization requests
  socket.on('state:sync', async (data) => {
    if (!socket.userId) {
      return socket.emit('error', { message: 'Not authenticated' });
    }
    
    try {
      // Broadcast state changes to all user's devices
      io.to(`user:${socket.userId}`).emit('state:update', data);
      logger.debug(`State sync for user ${socket.userId}:`, data);
    } catch (error) {
      logger.error('State sync error:', error);
      socket.emit('error', { message: 'Sync failed' });
    }
  });
  
  // Handle business data updates
  socket.on('business:update', async (data) => {
    if (!socket.userId) {
      return socket.emit('error', { message: 'Not authenticated' });
    }
    
    try {
      // Broadcast to all connected clients of the same business
      const user = await getUserById(socket.userId);
      if (user && user.businessId) {
        io.to(`business:${user.businessId}`).emit('business:changed', data);
      }
    } catch (error) {
      logger.error('Business update error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  
  // Return appropriate response based on request type
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
  }
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  try {
    const db = getDBConnection();
    if (db) {
      await db.close();
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database:', error);
  }
  
  // Close Socket.IO connections
  io.close(() => {
    logger.info('Socket.IO server closed');
  });
  
  // Exit process
  setTimeout(() => {
    logger.warn('Forcefully shutting down after timeout');
    process.exit(1);
  }, 10000); // 10 second timeout
  
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info('='.repeat(60));
  logger.info('🚀 Ava Solutions Unified Backend Started');
  logger.info('='.repeat(60));
  logger.info(`📍 Server: http://${HOST}:${PORT}`);
  logger.info(`🏥 Health: http://${HOST}:${PORT}/health`);
  logger.info(`📱 PWA API: http://${HOST}:${PORT}/api`);
  logger.info(`🌐 Marketing: http://${HOST}:${PORT}/marketing`);
  logger.info(`👨‍💼 Admin: http://${HOST}:${PORT}/admin`);
  logger.info(`🔄 Real-time: ws://${HOST}:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💾 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017'}`);
  logger.info('='.repeat(60));
});

// Helper functions (these would typically be in separate modules)
async function verifyToken(token) {
  // Implementation would verify JWT token and return user ID
  // This is a placeholder
  return null;
}

async function getUserById(userId) {
  // Implementation would fetch user from database
  // This is a placeholder
  return null;
}

export default app;