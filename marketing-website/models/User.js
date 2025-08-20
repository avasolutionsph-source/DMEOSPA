import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
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
  
  // Subscription info
  subscriptionPlan: {
    type: String,
    enum: ['unpaid', 'pro'],
    default: 'unpaid'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active'
  },
  subscriptionStart: {
    type: Date,
    default: Date.now
  },
  subscriptionEnd: {
    type: Date
  },
  
  // Role (for super admin)
  role: {
    type: String,
    enum: ['owner','employee','receptionist','therapist','manager','admin','customer','superAdmin','franchise_owner'],
    default: 'customer'
  },
  
  // Business type and franchise information
  businessType: {
    type: String,
    enum: ['single_location', 'franchise_owner'],
    default: 'single_location'
  },
  franchiseSize: {
    type: String,
    enum: ['1-5', '6-10', '11+'],
    required: false
  },
  isMainOwner: {
    type: Boolean,
    default: false
  },
  
  // Permissions by role (for PWA compatibility)
  permissions: {
    dashboard: { type: Boolean, default: true },
    pos: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    employees: { type: Boolean, default: true },
    bookings: { type: Boolean, default: true },
    products: { type: Boolean, default: true },
    rooms: { type: Boolean, default: true },
    settings: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    chatbot: { type: Boolean, default: true },
    therapistPortal: { type: Boolean, default: false },
    timer: { type: Boolean, default: false },
    expenses: { type: Boolean, default: true }
  },

  // Business ownership/affiliation
  businessId: { type: String }, // for owners: equals _id; for employees: owner's _id
  ownerId: { type: String },
  employeeId: { type: String }, // link to PWA employee record id
  employeeName: { type: String },
  // For branch accounts only: owner's view of the current password (owner-only display)
  ownerPasswordNote: { type: String },
  
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
    weekSales: { type: Number, default: 0 },
    weekTransactions: { type: Number, default: 0 },
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
  
  // Detailed products/services data (synced from PWA)
  products: [{
    id: String,
    name: String,
    category: String,
    price: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now }
  }],

  // Customer bookings captured by marketing site when PWA backend is unreachable
  bookings: [{
    source: { type: String, default: 'booking-site' },
    storeId: String,
    storeName: String,
    customer: {
      name: String,
      phone: String,
      email: String
    },
    serviceId: String,
    serviceName: String,
    durationMins: { type: Number, default: 60 },
    partySize: { type: Number, default: 1 },
    employeeId: String,
    employeeName: String,
    startTime: Date,
    status: { type: String, default: 'pending' },
    notes: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Stores/branches
  stores: [{
    id: { type: String, default: 'default' },
    name: { type: String, default: 'Main Branch' },
    address: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  // Admin notes
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
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

// Set permissions based on role
userSchema.methods.setRolePermissions = function() {
  const rolePermissions = {
    owner: {
      dashboard: true, pos: true, inventory: true, employees: true,
      bookings: true, products: true, rooms: true, settings: true,
      analytics: true, chatbot: true, therapistPortal: false, timer: false,
      expenses: true
    },
    manager: {
      dashboard: true, pos: true, inventory: true, employees: true,
      bookings: true, products: true, rooms: true, settings: true,
      analytics: true, chatbot: false, therapistPortal: false, timer: false,
      expenses: true
    },
    therapist: {
      dashboard: true, pos: false, inventory: false, employees: false,
      bookings: true, products: false, rooms: false, settings: true,
      analytics: false, chatbot: false, therapistPortal: true, timer: true,
      expenses: false
    },
    receptionist: {
      dashboard: true, pos: true, inventory: false, employees: false,
      bookings: true, products: false, rooms: true, settings: false,
      analytics: false, chatbot: false, therapistPortal: false, timer: false,
      expenses: true
    },
    employee: {
      dashboard: true, pos: true, inventory: false, employees: false,
      bookings: true, products: false, rooms: false, settings: false,
      analytics: false, chatbot: false, therapistPortal: false, timer: false,
      expenses: true
    },
    customer: {
      dashboard: false, pos: false, inventory: false, employees: false,
      bookings: true, products: false, rooms: false, settings: false,
      analytics: false, chatbot: false, therapistPortal: false, timer: false,
      expenses: false
    },
    admin: {
      dashboard: true, pos: true, inventory: true, employees: true,
      bookings: true, products: true, rooms: true, settings: true,
      analytics: true, chatbot: true, therapistPortal: false, timer: false,
      expenses: true
    },
    superAdmin: {
      dashboard: true, pos: true, inventory: true, employees: true,
      bookings: true, products: true, rooms: true, settings: true,
      analytics: true, chatbot: true, therapistPortal: false, timer: false,
      expenses: true
    }
  };

  this.permissions = rolePermissions[this.role] || rolePermissions.customer;
};

// Auto-set permissions before save
userSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    this.setRolePermissions();
  }
  next();
});

// Indexes
userSchema.index({ subscriptionPlan: 1 });
userSchema.index({ 'businessMetrics.lastActiveDate': 1 });
userSchema.index({ createdAt: 1 });

export default mongoose.model('User', userSchema);
