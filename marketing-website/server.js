import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import bookingRoutes from './routes/booking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for website
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: { error: 'Too many requests' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// CORS - Allow all origins for development with comprehensive settings
app.use(cors({ 
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:5500', 'http://localhost:4000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Passport middleware
app.use(passport.initialize());

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Ava Solutions Marketing Website is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
// Get user business name endpoint
app.get('/api/user/business-name', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable not set');
    }
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the real business name from database
    res.json({
      businessName: user.businessName || user.email.split('@')[0],
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

  } catch (error) {
    console.error('Business name fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch business name' });
  }
});


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/booking', bookingRoutes);

// Business employees endpoint - PROXY TO PWA BACKEND
app.get('/api/business/employees', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Forward request to PWA backend
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    const response = await fetch(`${pwaBackendUrl}/api/business/employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error || 'Failed to fetch from PWA backend' });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Business employees proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch employee data' });
  }
});

// Business inventory endpoint - PROXY TO PWA BACKEND
app.get('/api/business/inventory', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Forward request to PWA backend
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    const response = await fetch(`${pwaBackendUrl}/api/business/inventory`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error || 'Failed to fetch from PWA backend' });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Business inventory proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

// Business stats endpoint - PROXY TO PWA BACKEND
app.get('/api/business/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Forward request to PWA backend
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    const response = await fetch(`${pwaBackendUrl}/api/business/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error || 'Failed to fetch from PWA backend' });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Business stats proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch business stats' });
  }
});

// Real-time sync endpoint - PROXY TO BACKEND SYNC/PULL
app.get('/api/sync/pull', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Forward request to PWA backend sync endpoint
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    const response = await fetch(`${pwaBackendUrl}/api/sync/pull`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ 
        success: false,
        error: error || 'Failed to fetch from PWA backend' 
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Sync pull proxy error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to pull sync data' 
    });
  }
});

// Business sync endpoint - receives data from PWA
app.post('/api/business/sync', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable not set');
    }
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a real implementation, you would:
    // 1. Receive sync data from PWA backend
    // 2. Update user's business metrics
    // 3. Store detailed records if needed
    // 4. Clean up old data to save space

    // For now, we'll simulate receiving data from PWA
    // You would typically call the PWA backend API here to get latest data
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    
    try {
      // Fetch latest data from PWA backend for this user
      // This is where you'd implement the real sync logic
      const pwaResponse = await fetch(`${pwaBackendUrl}/api/user-summary/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let syncData = {};
      if (pwaResponse.ok) {
        syncData = await pwaResponse.json();
      }

      // Update user's business metrics with real or simulated data
      const updatedMetrics = {
        totalSales: syncData.totalSales || user.businessMetrics?.totalSales || 0,
        totalTransactions: syncData.totalTransactions || user.businessMetrics?.totalTransactions || 0,
        totalProducts: syncData.totalProducts || user.businessMetrics?.totalProducts || 0,
        totalEmployees: syncData.totalEmployees || user.businessMetrics?.totalEmployees || 0,
        lastSyncDate: new Date(),
        lastActiveDate: new Date()
      };

      user.businessMetrics = updatedMetrics;
      await user.save();

      res.json({ 
        success: true, 
        message: 'Sync completed successfully',
        recordsUpdated: 1,
        lastSyncDate: updatedMetrics.lastSyncDate
      });

    } catch (pwaError) {
      // If PWA backend is not available, still update sync date
      user.businessMetrics = {
        ...user.businessMetrics,
        lastSyncDate: new Date(),
        lastActiveDate: new Date()
      };
      await user.save();

      res.json({ 
        success: true, 
        message: 'Sync completed (PWA backend unavailable)',
        recordsUpdated: 0,
        lastSyncDate: user.businessMetrics.lastSyncDate
      });
    }

  } catch (error) {
    console.error('Business sync error:', error);
    res.status(500).json({ error: 'Failed to sync business data' });
  }
});

// Website Routes - Professional Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});




app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/contact.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

// Super Admin Panel (YOU)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Admin Dashboard (for admin role only)
app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-dashboard.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-login.html'));
});


// Business Dashboard (for business owners)
app.get('/business-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/business-dashboard.html'));
});

// Dashboard redirect (redirect to PWA for direct access)
app.get('/dashboard', (req, res) => {
  res.redirect('https://ava-solutions-pwa.netlify.app');
});

// About and Services Pages
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/about.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/services.html'));
});

// Legal Pages
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/privacy-policy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/terms.html'));
});

app.get('/cookie-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/cookie-policy.html'));
});

app.get('/compliance', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/compliance.html'));
});

// Client booking page
app.get('/book-appointment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/book-appointment.html'));
});

// Client profile page
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/profile.html'));
});

// Admin bookings management page
app.get('/admin-bookings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-bookings.html'));
});

// Branch bookings management page
app.get('/branch-bookings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/branch-bookings.html'));
});




// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
  }
});

const port = process.env.MARKETING_PORT || 3005;
app.listen(port, () => {
  console.log(`🌐 Ava Solutions Marketing Website running on port ${port}`);
  console.log(`🏠 Homepage: http://localhost:${port}`);
  console.log(`👑 Super Admin: http://localhost:${port}/admin`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
});
