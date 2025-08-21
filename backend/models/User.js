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
    enum: ['unpaid', 'free', 'pro', 'enterprise'],
    default: 'pro'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active'
  },
  
  // Role and permissions
  role: {
    type: String,
    enum: ['owner','employee','receptionist','therapist','manager','admin','customer','superAdmin'],
    default: 'owner'
  },

  // Business ownership
  businessId: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Permissions by role
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
  
  // Business metrics
  businessMetrics: {
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalEmployees: { type: Number, default: 0 },
    lastSyncDate: { type: Date },
    lastActiveDate: { type: Date, default: Date.now }
  },
  
  // Published catalog data for booking website
  products: [{
    id: String,
    name: String,
    category: { type: String, default: 'service' },
    duration: { type: Number, default: 60 },
    price: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now }
  }],
  
  employees: [{
    id: String,
    name: String,
    position: String,
    email: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now }
  }],

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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
    superAdmin: {
      dashboard: true, pos: true, inventory: true, employees: true,
      bookings: true, products: true, rooms: true, settings: true,
      analytics: true, chatbot: true, therapistPortal: true, timer: true,
      expenses: true
    }
  };

  this.permissions = rolePermissions[this.role] || rolePermissions.employee;
};

// Auto-set permissions before save
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.setRolePermissions();
  }
  next();
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ businessId: 1 });

export default mongoose.model('User', userSchema);