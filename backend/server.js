import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import plansRoutes from './routes/plans.js';

const app = express();

// Connect to MongoDB
await connectDB();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests' }
});
app.use('/api', limiter);

// CORS - Allow all three frontends
app.use(cors({ 
  origin: [
    // Local development
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 
    'http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:4000',
    // Production frontends
    'https://ava-solutions-marketing.netlify.app', 
    'https://ava-solutions-pwa.netlify.app', 
    'https://ava-solutions-booking.netlify.app', 
    'https://avaphbooking.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Ava Solutions Unified Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      name: mongoose.connection.name
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plans', plansRoutes);

// Serve static files for frontends (if needed)
app.use('/marketing', express.static('../frontend-marketing'));
app.use('/pwa', express.static('../frontend-pwa'));
app.use('/booking', express.static('../frontend-booking'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Ava Solutions Unified Backend running on port ${port}`);
  console.log(`📱 Health: http://localhost:${port}/api/health`);
  console.log(`🔐 Auth: http://localhost:${port}/api/auth`);
  console.log(`👨‍💼 Admin: http://localhost:${port}/api/admin`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});