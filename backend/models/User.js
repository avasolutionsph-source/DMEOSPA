import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic info
  email: {
    type: String,
    required: function() {
      // Email is required unless user signed up via social auth without email
      return !this.googleId && !this.facebookId;
    },
    unique: true,
    sparse: true, // Allow multiple null values
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password is not required for OAuth users
      return !this.googleId && !this.facebookId;
    },
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // OAuth fields
  googleId: {
    type: String,
    sparse: true
  },
  facebookId: {
    type: String,
    sparse: true
  },
  avatar: {
    type: String // Profile picture URL
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Role (for super admin)
  role: {
    type: String,
    enum: ['branch', 'admin', 'superAdmin', 'client'],
    default: 'branch'
  },
  
  // PWA connection
  pwaUserId: {
    type: String, // Links to PWA backend user
    sparse: true
  },
  
  // Business metrics (from PWA sync)
  businessMetrics: {
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalEmployees: { type: Number, default: 0 },
    // Time-based sales metrics
    todaySales: { type: Number, default: 0 },
    todayTransactions: { type: Number, default: 0 },
    monthSales: { type: Number, default: 0 },
    monthTransactions: { type: Number, default: 0 },
    yearSales: { type: Number, default: 0 },
    yearTransactions: { type: Number, default: 0 },
    lastSyncDate: { type: Date },
    lastActiveDate: { type: Date }
  },
  
  // Detailed employee data (synced from PWA)
  employees: [{
    id: String,
    name: String,
    position: String,
    email: String,
    phone: String,
    hiredDate: Date,
    commission: Number,
    totalSales: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    transactions: { type: Number, default: 0 },
    avgSale: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Detailed inventory data (synced from PWA)
  inventory: [{
    id: String,
    name: String,
    sku: String,
    category: String,
    quantity: { type: Number, default: 0 },
    unit: String,
    minStock: { type: Number, default: 5 },
    price: Number,
    cost: Number,
    supplier: String,
    description: String,
    lastRestocked: Date,
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Admin notes
  notes: {
    type: String,
    trim: true
  },

  // Website branding customization
  branding: {
    // Hero section customization
    heroImageUrl: {
      type: String,
      default: null // Custom uploaded image or template selection
    },
    heroTemplate: {
      type: String,
      enum: ['template1', 'template2', 'template3', 'template4', 'template5', 'custom'],
      default: 'template1' // Default to first template
    },
    heroTitle: {
      type: String,
      default: 'Massage & Spa' // Customizable title
    },
    heroSubtitle: {
      type: String,
      default: 'Where tranquility meets expertise' // Customizable subtitle
    },
    ctaButtonText: {
      type: String,
      default: 'Book Now' // CTA button text
    },
    ctaButtonLink: {
      type: String,
      default: '/book-appointment' // CTA button link
    },

    // Business logo
    logoUrl: {
      type: String,
      default: null
    },

    // Color scheme
    primaryColor: {
      type: String,
      default: '#2c3e50' // Brand primary color
    },
    accentColor: {
      type: String,
      default: '#3498db' // Brand accent color
    },

    // Custom gradient colors
    gradientColor1: {
      type: String,
      default: '#667eea' // Gradient start color
    },
    gradientColor2: {
      type: String,
      default: '#764ba2' // Gradient end color
    },
    gradientAngle: {
      type: String,
      default: '135deg' // Gradient direction
    },
    useCustomGradient: {
      type: Boolean,
      default: false // Use custom gradient instead of template colors
    },

    // Advanced settings
    showHeroBanner: {
      type: Boolean,
      default: true // Enable/disable hero banner
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Hash password before saving (only for local auth users)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ 'businessMetrics.lastActiveDate': 1 });
userSchema.index({ createdAt: 1 });

export default mongoose.model('User', userSchema);
