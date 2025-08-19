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
const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:4000', 'https://ava-solutions-marketing.netlify.app', 'https://ava-solutions-pwa.netlify.app', 'https://ava-solutions-booking.netlify.app'];
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

// Invite employee (owner creates employee account)
app.post('/api/employees/invite', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const inviterId = decoded.userId;
    const role = (req.body.role || 'employee');
    const email = req.body.email;
    const name = req.body.name || '';
    const tempPassword = req.body.password || Math.random().toString(36).slice(-10);
    if (!email) return res.status(400).json({ error: 'Email required' });
    const User = (await import('./models/User.js')).default;
    const inviter = await User.findById(inviterId);
    if (!inviter) return res.status(404).json({ error: 'Owner not found' });
    let existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const [firstName, ...rest] = name.split(' ');
    const employee = new User({
      email,
      password: tempPassword,
      firstName: firstName || 'Employee',
      lastName: rest.join(' ') || 'Account',
      businessName: inviter.businessName,
      role,
      businessId: String(inviter._id),
      ownerId: String(inviter._id)
    });
    await employee.save();
    res.json({ success: true, tempPassword, employeeId: employee._id });
  } catch (e) {
    console.error('Invite employee error:', e.message);
    res.status(500).json({ error: 'Failed to invite employee' });
  }
});

// Create a new Branch (separate login per branch) under current owner
app.post('/api/branches/create', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;

    const { branchName, email, password, plan } = req.body || {};
    if (!branchName || !email || !password) return res.status(400).json({ error: 'branchName, email and password required' });

    const User = (await import('./models/User.js')).default;
    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already used' });

    const branch = new User({
      email,
      password,
      firstName: branchName,
      lastName: 'Branch',
      businessName: branchName,
      subscriptionPlan: plan || 'unpaid',
      role: 'owner',
      ownerId: String(owner._id),
      ownerPasswordNote: password
    });
    await branch.save();
    res.json({ success: true, branchId: branch._id, email });
  } catch (e) {
    console.error('Create branch error:', e.message);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// List branches owned by current owner
app.get('/api/branches', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const User = (await import('./models/User.js')).default;
    const self = await User.findById(ownerId).select('ownerId businessName email').lean();
    const isMainOwner = !self?.ownerId; // true when this account is the primary owner
    const branches = await User.find({ ownerId, role: 'owner' })
      .select('_id email businessName subscriptionPlan createdAt ownerPasswordNote')
      .lean();
    res.json({ success: true, isMainOwner, selfId: String(ownerId), data: branches.map(b => ({ id: String(b._id), email: b.email, name: b.businessName, plan: b.subscriptionPlan, createdAt: b.createdAt, ownerPasswordNote: b.ownerPasswordNote || '' })) });
  } catch (e) {
    console.error('List branches error:', e.message);
    res.status(500).json({ error: 'Failed to list branches' });
  }
});

// Reset a branch account password (owner only) and return the new temp password
app.post('/api/branches/:id/reset-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const branchId = req.params.id;

    const User = (await import('./models/User.js')).default;
    const branch = await User.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (String(branch.ownerId) !== String(ownerId)) return res.status(403).json({ error: 'Not your branch' });

    // If a newPassword was provided, change it; otherwise just show the ownerPasswordNote
    const { newPassword } = req.body || {};
    if (typeof newPassword === 'string' && newPassword.trim().length >= 6) {
      branch.password = newPassword.trim();
      branch.ownerPasswordNote = newPassword.trim();
      await branch.save();
      return res.json({ success: true, changed: true, password: branch.ownerPasswordNote });
    }
    // Just return the last recorded/password note; if absent, return masked
    const note = branch.ownerPasswordNote ? branch.ownerPasswordNote : '••••••••';
    return res.json({ success: true, changed: false, password: note });
  } catch (e) {
    console.error('Reset branch password error:', e.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Show a branch's current password note (owner only, no mutation)
app.get('/api/branches/:id/password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const branchId = req.params.id;
    const User = (await import('./models/User.js')).default;
    const branch = await User.findById(branchId).select('ownerId ownerPasswordNote');
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (String(branch.ownerId) !== String(ownerId)) return res.status(403).json({ error: 'Not your branch' });
    return res.json({ success: true, password: branch.ownerPasswordNote || '' });
  } catch (e) {
    console.error('Show branch password error:', e.message);
    res.status(500).json({ error: 'Failed to fetch password' });
  }
});

// List invited employees for owner
app.get('/api/employees', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const User = (await import('./models/User.js')).default;
    const employees = await User.find({ ownerId, role: { $in: ['employee','receptionist','therapist','manager'] } })
      .select('_id email role employeeId employeeName firstName lastName')
      .lean();
    res.json({ success: true, data: employees.map(u => ({ id: String(u._id), email: u.email, role: u.role, employeeId: u.employeeId||null, employeeName: u.employeeName || `${u.firstName} ${u.lastName}`.trim() })) });
  } catch (e) {
    console.error('List employees error:', e.message);
    res.status(500).json({ error: 'Failed to list employees' });
  }
});

// Reset employee password (owner)
app.post('/api/employees/reset-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const { userId, email } = req.body || {};
    const User = (await import('./models/User.js')).default;
    const query = userId ? { _id: userId, ownerId } : { email, ownerId };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'Employee not found' });
    const temp = Math.random().toString(36).slice(-10);
    user.password = temp; // pre-save hook hashes
    await user.save();
    res.json({ success: true, tempPassword: temp });
  } catch (e) {
    console.error('Reset employee password error:', e.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change employee role
app.put('/api/employees/:id/role', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const User = (await import('./models/User.js')).default;
    const user = await User.findOne({ _id: req.params.id, ownerId });
    if (!user) return res.status(404).json({ error: 'Employee not found' });
    const role = String(req.body.role || 'employee');
    user.role = role;
    await user.save();
    res.json({ success: true });
  } catch (e) {
    console.error('Update employee role error:', e.message);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Link a marketing user to a PWA employee record
app.post('/api/employees/link', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const ownerId = decoded.userId;
    const { email, userId, employeeId, employeeName } = req.body || {};
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
    const User = (await import('./models/User.js')).default;
    const query = userId ? { _id: userId, ownerId } : { email, ownerId };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'Employee not found' });
    user.employeeId = String(employeeId);
    if (employeeName) user.employeeName = employeeName;
    await user.save();
    res.json({ success: true });
  } catch (e) {
    console.error('Link employee error:', e.message);
    res.status(500).json({ error: 'Failed to link employee' });
  }
});

// Public config for clients (e.g., booking site)
app.get('/api/config', (req, res) => {
  const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
  res.json({ pwaBackendUrl });
});

// Publish catalog (services/products + employees) for booking site consumption
app.post('/api/public/publish-catalog', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId;

    const User = (await import('./models/User.js')).default;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { products = [], employees = [] } = req.body || {};

    // Sanitize and store minimal fields only
    const sanitizedProducts = (Array.isArray(products) ? products : [])
      .map(p => ({
        id: String(p.id || p._id || ''),
        name: String(p.name || ''),
        category: String(p.category || 'service'),
        duration: Number(p.duration || 0),
        price: Number(p.price || 0),
        isActive: p.isActive !== false
      }));

    const sanitizedEmployees = (Array.isArray(employees) ? employees : [])
      .map(e => ({
        id: String(e.id || e._id || ''),
        name: String(e.name || ''),
        position: String(e.position || ''),
        email: String(e.email || ''),
        phone: String(e.phone || '')
      }));

    user.products = sanitizedProducts;
    user.employees = sanitizedEmployees;
    await user.save();

    res.json({ success: true, products: sanitizedProducts.length, employees: sanitizedEmployees.length });
  } catch (error) {
    console.error('Publish catalog error:', error);
    res.status(500).json({ error: 'Failed to publish catalog' });
  }
});

// Public: list businesses for booking directory
app.get('/api/public/businesses', async (req, res) => {
  try {
    const User = (await import('./models/User.js')).default;
    const businesses = await User.find({ subscriptionStatus: 'active' })
      .select('_id businessName')
      .limit(500)
      .lean();
    res.json({ success: true, data: businesses.map(b => ({ id: String(b._id), name: b.businessName })) });
  } catch (err) {
    console.error('List businesses error:', err);
    res.status(500).json({ error: 'Failed to list businesses' });
  }
});

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
    console.error('Bookings proxy error:', err.message);
    // Fallback: store booking directly in marketing DB so owners can still see it
    try {
      if (req.method === 'POST') {
        const User = (await import('./models/User.js')).default;
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(500).json({ error: 'Failed to reach bookings backend' });
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const payload = req.body || {};
        user.bookings = user.bookings || [];
        user.bookings.push({
          source: payload.source || 'booking-site',
          storeId: payload.storeId,
          storeName: payload.storeName,
          customer: payload.customer,
          serviceId: payload.serviceId,
          serviceName: payload.serviceName,
          durationMins: payload.durationMins || 60,
          partySize: payload.partySize || 1,
          employeeId: payload.employeeId,
          employeeName: payload.employeeName,
          startTime: payload.startTime ? new Date(payload.startTime) : new Date(),
          status: payload.status || 'pending',
          notes: payload.notes || ''
        });
        await user.save();
        return res.status(201).json({ success: true, data: { id: user.bookings[user.bookings.length-1]._id } });
      }
    } catch (fallbackErr) {
      console.error('Bookings fallback error:', fallbackErr.message);
    }
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
    if (response.ok) {
      const text = await response.text();
      return res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
    }
    console.warn('Availability proxy non-200:', response.status);
  } catch (err) {
    console.error('Availability proxy error:', err.message);
  }
  // Fallback: return generic hourly slots 9am-9pm
  try {
    const dateStr = (req.query.date || new Date().toISOString().split('T')[0]).toString();
    const base = new Date(dateStr);
    base.setHours(9,0,0,0);
    const slots = [];
    for (let i=0;i<12;i++) {
      const start = new Date(base.getTime() + i*60*60*1000).toISOString();
      slots.push({ startTime: start, available: true });
    }
    return res.json({ success: true, data: { slots } });
  } catch (e) {
    return res.json({ success: true, data: { slots: [] } });
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
    if (response.ok) {
      const text = await response.text();
      return res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
    }
    console.warn('Products proxy non-200:', response.status);
  } catch (err) {
    console.error('Products proxy error:', err.message);
  }
  // Fallback: minimal products from marketing DB if available
  try {
    const User = (await import('./models/User.js')).default;
    const userId = req.headers['x-user-id'];
    if (!userId) return res.json({ success: true, data: [] });
    const user = await User.findById(userId).lean();
    const products = user?.products || [];
    return res.json({ success: true, data: products });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load products' });
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
    if (response.ok) {
      const text = await response.text();
      return res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
    }
    console.warn('Employees proxy non-200:', response.status);
  } catch (err) {
    console.error('Employees proxy error:', err.message);
  }
  // Fallback: employees from marketing DB if available
  try {
    const User = (await import('./models/User.js')).default;
    const userId = req.headers['x-user-id'];
    if (!userId) return res.json({ success: true, data: [] });
    const user = await User.findById(userId).lean();
    const employees = user?.employees || [];
    return res.json({ success: true, data: employees });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load employees' });
  }
});

// Owner fetch bookings fallback from marketing DB
app.get('/api/business/bookings', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId).lean();
    return res.json({ bookings: user?.bookings || [] });
  } catch (e) {
    console.error('Business bookings fetch error:', e.message);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
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
    const branchId = req.query.branchId;
    const User = (await import('./models/User.js')).default;
    let user = null;
    if (branchId && String(branchId) !== String(decoded.userId)) {
      const branch = await User.findById(branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      if (String(branch.ownerId) !== String(decoded.userId)) return res.status(403).json({ error: 'Not your branch' });
      user = branch;
    } else {
      user = await User.findById(decoded.userId);
    }
    
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
    const branchId = req.query.branchId;
    const User = (await import('./models/User.js')).default;
    let user = null;
    if (branchId && String(branchId) !== String(decoded.userId)) {
      const branch = await User.findById(branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      if (String(branch.ownerId) !== String(decoded.userId)) return res.status(403).json({ error: 'Not your branch' });
      user = branch;
    } else {
      user = await User.findById(decoded.userId);
    }
    
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
    const branchId = req.query.branchId;
    const aggregate = req.query.aggregate === 'branches';
    // Import User model
    const User = (await import('./models/User.js')).default;
    let user = null;
    if (branchId && String(branchId) !== String(decoded.userId)) {
      const branch = await User.findById(branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      if (String(branch.ownerId) !== String(decoded.userId)) return res.status(403).json({ error: 'Not your branch' });
      user = branch;
    } else {
      user = await User.findById(decoded.userId);
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (aggregate) {
      // Sum metrics across all branches owned by this owner
      const branches = await User.find({ ownerId: decoded.userId, role: 'owner' }).select('businessMetrics').lean();
      const sum = (arr, field) => arr.reduce((acc, b) => acc + (b.businessMetrics?.[field] || 0), 0);
      const result = {
        totalSales: sum(branches, 'totalSales'),
        totalTransactions: sum(branches, 'totalTransactions'),
        totalProducts: sum(branches, 'totalProducts'),
        totalEmployees: sum(branches, 'totalEmployees'),
        todaySales: sum(branches, 'todaySales'),
        todayTransactions: sum(branches, 'todayTransactions'),
        weekSales: sum(branches, 'weekSales'),
        weekTransactions: sum(branches, 'weekTransactions'),
        monthSales: sum(branches, 'monthSales'),
        monthTransactions: sum(branches, 'monthTransactions'),
        yearSales: sum(branches, 'yearSales'),
        yearTransactions: sum(branches, 'yearTransactions'),
        lastSyncDate: new Date()
      };
      return res.json(result);
    }

    // Return single account/branch metrics
    res.json({
      totalSales: user.businessMetrics?.totalSales || 0,
      totalTransactions: user.businessMetrics?.totalTransactions || 0,
      totalProducts: user.businessMetrics?.totalProducts || 0,
      totalEmployees: user.businessMetrics?.totalEmployees || 0,
      todaySales: user.businessMetrics?.todaySales || 0,
      todayTransactions: user.businessMetrics?.todayTransactions || 0,
      weekSales: user.businessMetrics?.weekSales || 0,
      weekTransactions: user.businessMetrics?.weekTransactions || 0,
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

    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'http://localhost:4000';
    
    try {
      const pwaResponse = await fetch(`${pwaBackendUrl}/api/user-summary/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let syncData = {};
      if (pwaResponse.ok) {
        syncData = await pwaResponse.json();
      }

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

// Removed owner bookings page (bookings are viewed from the booking site)

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
