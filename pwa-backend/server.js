import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import userRoutes from './routes/user.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  console.log('📊 Database connection attempt completed');
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - more generous for PWA sync
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for PWA operations
  message: { error: 'Too many requests' }
});
app.use('/api', limiter);

// CORS - Allow PWA to connect from anywhere with comprehensive settings
app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 
      'http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:4000',
      'https://ava-solutions-marketing.netlify.app', 
      'https://ava-solutions-pwa.netlify.app', 
      'https://ava-solutions-booking.netlify.app', 
      'https://avaphbooking.netlify.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log('🔄 OPTIONS preflight request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parser
app.use(express.json({ limit: '10mb' })); // Large limit for sync data
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', async (req, res) => {
  // Import mongoose to check connection
  const mongoose = (await import('mongoose')).default;
  
  res.json({ 
    ok: true, 
    message: 'Ava Solutions PWA Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      stateNames: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    }
  });
});

// API Routes (exactly what your PWA expects)
app.use('/api/auth', authRoutes);
app.use('/api', syncRoutes); // products/inventory/employees/transactions sync
app.use('/api/user', userRoutes);
app.use('/api', bookingRoutes); // bookings & availability
app.use('/api/admin', adminRoutes); // admin dashboard routes

// Public routes for booking website (no auth required)
app.use('/api', authRoutes); // Mount auth routes under /api as well for public endpoints

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler for API routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🔧 Ava Solutions PWA Backend running on port ${port}`);
  console.log(`📱 API Health: http://localhost:${port}/api/health`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ PWA can connect by setting API URL to: http://localhost:${port}/api`);
  console.log(`🌐 CORS enabled for: https://ava-solutions-marketing.netlify.app`);
  console.log(`🔐 Login endpoint: http://localhost:${port}/api/auth/login`);
});
