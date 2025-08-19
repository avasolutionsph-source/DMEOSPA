import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import subscriptionRoutes from './routes/subscription.js';
import syncRoutes from './routes/sync.js';

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

// CORS - Allow configured origins (include Netlify and Render domains in production)
const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:4000', 'https://ava-solutions-marketing.netlify.app', 'https://ava-solutions-pwa.netlify.app'];
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || /netlify\.app$/.test(new URL(origin).hostname) || /onrender\.com$/.test(new URL(origin).hostname)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
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
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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

// Get user's current subscription status
app.get('/api/user/subscription', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a new token with current subscription info
    const newToken = jwt.default.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        businessName: user.businessName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    console.log('🔄 Subscription check for user:', user.email, 'Plan:', user.subscriptionPlan);

    // Return current subscription info and new token
    res.json({
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      businessName: user.businessName || user.email.split('@')[0],
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      token: newToken
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api', syncRoutes); // Mount sync routes under /api

// Proxy bookings and availability to PWA backend so PWA/webapp can use one base URL
app.use('/api/bookings', async (req, res) => {
  try {
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
    const url = `${pwaBackendUrl}${req.originalUrl}`; // preserve /api/bookings... path
    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      ...(req.headers['x-user-id'] ? { 'x-user-id': req.headers['x-user-id'] } : {})
    };
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: ['POST','PUT','PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('Bookings proxy error:', err);
    res.status(500).json({ error: 'Failed to reach bookings backend' });
  }
});

app.use('/api/availability', async (req, res) => {
  try {
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
    const url = `${pwaBackendUrl}${req.originalUrl}`;
    const headers = {
      ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      ...(req.headers['x-user-id'] ? { 'x-user-id': req.headers['x-user-id'] } : {})
    };
    const response = await fetch(url, { method: 'GET', headers });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('Availability proxy error:', err);
    res.status(500).json({ error: 'Failed to reach availability backend' });
  }
});

// Proxy products and employees (GET) to PWA backend for booking site catalog
app.use('/api/products', async (req, res) => {
  try {
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
    const url = `${pwaBackendUrl}${req.originalUrl}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      ...(req.headers['x-user-id'] ? { 'x-user-id': req.headers['x-user-id'] } : {})
    };
    const response = await fetch(url, { method: req.method, headers });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('Products proxy error:', err);
    res.status(500).json({ error: 'Failed to reach products backend' });
  }
});

app.use('/api/employees', async (req, res) => {
  try {
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
    const url = `${pwaBackendUrl}${req.originalUrl}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      ...(req.headers['x-user-id'] ? { 'x-user-id': req.headers['x-user-id'] } : {})
    };
    const response = await fetch(url, { method: req.method, headers });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('Employees proxy error:', err);
    res.status(500).json({ error: 'Failed to reach employees backend' });
  }
});

// Business employees endpoint
app.get('/api/business/employees', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return detailed employee data
    console.log('📋 Fetching employees for user:', decoded.userId);
    console.log('👥 Found employees:', user.employees?.length || 0);
    console.log('📊 Employee data:', user.employees?.map(emp => ({ name: emp.name, position: emp.position })) || []);
    
    res.json({
      employees: user.employees || [],
      totalEmployees: user.businessMetrics?.totalEmployees || 0,
      lastSyncDate: user.businessMetrics?.lastSyncDate || null
    });

  } catch (error) {
    console.error('Business employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employee data' });
  }
});

// Business inventory endpoint
app.get('/api/business/inventory', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return detailed inventory data
    console.log('📦 Fetching inventory for user:', decoded.userId);
    console.log('📦 Found inventory items:', user.inventory?.length || 0);
    
    res.json({
      inventory: user.inventory || [],
      totalItems: user.inventory?.length || 0,
      lowStockItems: user.inventory?.filter(item => 
        item.quantity <= (item.minStock || 5)
      ).length || 0,
      outOfStockItems: user.inventory?.filter(item => 
        item.quantity === 0
      ).length || 0,
      lastSyncDate: user.businessMetrics?.lastSyncDate || null
    });

  } catch (error) {
    console.error('Business inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

// Business stats endpoint
app.get('/api/business/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Import User model
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user's business metrics including time-based data
    res.json({
      totalSales: user.businessMetrics?.totalSales || 0,
      totalTransactions: user.businessMetrics?.totalTransactions || 0,
      totalProducts: user.businessMetrics?.totalProducts || 0,
      totalEmployees: user.businessMetrics?.totalEmployees || 0,
      // Time-based sales data
      todaySales: user.businessMetrics?.todaySales || 0,
      todayTransactions: user.businessMetrics?.todayTransactions || 0,
      monthSales: user.businessMetrics?.monthSales || 0,
      monthTransactions: user.businessMetrics?.monthTransactions || 0,
      yearSales: user.businessMetrics?.yearSales || 0,
      yearTransactions: user.businessMetrics?.yearTransactions || 0,
      lastSyncDate: user.businessMetrics?.lastSyncDate || null
    });

  } catch (error) {
    console.error('Business stats error:', error);
    res.status(500).json({ error: 'Failed to fetch business stats' });
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
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
    
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

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pricing.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/about.html'));
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

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-login.html'));
});

// PWA Download/Install page
app.get('/download', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/download.html'));
});

// Business Dashboard (for business owners)
app.get('/business-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/business-dashboard.html'));
});

// Dashboard redirect (redirect to PWA for direct access)
app.get('/dashboard', (req, res) => {
  res.redirect('https://ava-solutions-pwa.netlify.app');
});

// Handle upgrade plan routes
app.get('/upgrade', (req, res) => {
  const plan = req.query.plan || 'basic';
  res.redirect(`/pricing?plan=${plan}&upgrade=true`);
});

// Handle plan-specific upgrade routes
app.get('/upgrade/:plan', (req, res) => {
  const plan = req.params.plan;
  res.redirect(`/pricing?plan=${plan}&upgrade=true`);
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🌐 Ava Solutions Marketing Website running on port ${port}`);
  console.log(`🏠 Homepage: http://localhost:${port}`);
  console.log(`💰 Pricing: http://localhost:${port}/pricing`);
  console.log(`👑 Super Admin: http://localhost:${port}/admin`);
  console.log(`📱 PWA Download: http://localhost:${port}/download`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
});
