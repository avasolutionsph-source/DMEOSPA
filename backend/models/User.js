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
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'trial', 'past_due'],
    default: 'trial'
  },
  subscriptionId: String, // Stripe subscription ID
  customerId: String, // Stripe customer ID
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
  },
  subscriptionEndsAt: Date,
  
  // Plan-based limits and entitlements
  planLimits: {
    maxCustomers: { type: Number, default: 50 },
    maxEmployees: { type: Number, default: 1 },
    maxProducts: { type: Number, default: 20 },
    maxBookingsPerMonth: { type: Number, default: 100 },
    maxStorageGB: { type: Number, default: 1 },
    allowsOnlineBooking: { type: Boolean, default: false },
    allowsAdvancedReports: { type: Boolean, default: false },
    allowsCustomIntegrations: { type: Boolean, default: false },
    allowsAIInsights: { type: Boolean, default: false },
    allowsMultiLocation: { type: Boolean, default: false },
    allowsPrioritySupport: { type: Boolean, default: false },
    allowsWhiteLabel: { type: Boolean, default: false },
    allowsMobileApp: { type: Boolean, default: false }
  },
  
  // Current usage tracking
  currentUsage: {
    customersCount: { type: Number, default: 0 },
    employeesCount: { type: Number, default: 1 },
    productsCount: { type: Number, default: 0 },
    bookingsThisMonth: { type: Number, default: 0 },
    storageUsedGB: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
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

// Set plan limits based on subscription plan
userSchema.methods.setPlanLimits = function() {
  const planLimitsMap = {
    starter: {
      maxCustomers: 50,
      maxEmployees: 1,
      maxProducts: 20,
      maxBookingsPerMonth: 100,
      maxStorageGB: 1,
      allowsOnlineBooking: false,
      allowsAdvancedReports: false,
      allowsCustomIntegrations: false,
      allowsAIInsights: false,
      allowsMultiLocation: false,
      allowsPrioritySupport: false,
      allowsWhiteLabel: false,
      allowsMobileApp: false
    },
    professional: {
      maxCustomers: -1, // unlimited
      maxEmployees: 5,
      maxProducts: -1, // unlimited
      maxBookingsPerMonth: -1, // unlimited
      maxStorageGB: 10,
      allowsOnlineBooking: true,
      allowsAdvancedReports: true,
      allowsCustomIntegrations: false,
      allowsAIInsights: false,
      allowsMultiLocation: false,
      allowsPrioritySupport: true,
      allowsWhiteLabel: false,
      allowsMobileApp: true
    },
    enterprise: {
      maxCustomers: -1, // unlimited
      maxEmployees: -1, // unlimited
      maxProducts: -1, // unlimited
      maxBookingsPerMonth: -1, // unlimited
      maxStorageGB: 100,
      allowsOnlineBooking: true,
      allowsAdvancedReports: true,
      allowsCustomIntegrations: true,
      allowsAIInsights: true,
      allowsMultiLocation: true,
      allowsPrioritySupport: true,
      allowsWhiteLabel: true,
      allowsMobileApp: true
    }
  };

  this.planLimits = planLimitsMap[this.subscriptionPlan] || planLimitsMap.starter;
};

// Check if user can perform action based on plan limits
userSchema.methods.canPerformAction = function(action, additionalData = {}) {
  const now = new Date();
  
  // Check if subscription is active
  if (this.subscriptionStatus === 'cancelled' || this.subscriptionStatus === 'inactive') {
    return { allowed: false, reason: 'Subscription inactive' };
  }
  
  // Check if trial has expired
  if (this.subscriptionStatus === 'trial' && now > this.trialEndsAt) {
    return { allowed: false, reason: 'Trial expired' };
  }
  
  // Check specific limits based on action
  switch (action) {
    case 'addCustomer':
      if (this.planLimits.maxCustomers !== -1 && 
          this.currentUsage.customersCount >= this.planLimits.maxCustomers) {
        return { allowed: false, reason: 'Customer limit reached' };
      }
      break;
      
    case 'addEmployee':
      if (this.planLimits.maxEmployees !== -1 && 
          this.currentUsage.employeesCount >= this.planLimits.maxEmployees) {
        return { allowed: false, reason: 'Employee limit reached' };
      }
      break;
      
    case 'addProduct':
      if (this.planLimits.maxProducts !== -1 && 
          this.currentUsage.productsCount >= this.planLimits.maxProducts) {
        return { allowed: false, reason: 'Product limit reached' };
      }
      break;
      
    case 'addBooking':
      if (this.planLimits.maxBookingsPerMonth !== -1 && 
          this.currentUsage.bookingsThisMonth >= this.planLimits.maxBookingsPerMonth) {
        return { allowed: false, reason: 'Monthly booking limit reached' };
      }
      break;
      
    case 'onlineBooking':
      if (!this.planLimits.allowsOnlineBooking) {
        return { allowed: false, reason: 'Online booking not available in current plan' };
      }
      break;
      
    case 'advancedReports':
      if (!this.planLimits.allowsAdvancedReports) {
        return { allowed: false, reason: 'Advanced reports not available in current plan' };
      }
      break;
      
    case 'aiInsights':
      if (!this.planLimits.allowsAIInsights) {
        return { allowed: false, reason: 'AI insights not available in current plan' };
      }
      break;
      
    default:
      return { allowed: true };
  }
  
  return { allowed: true };
};

// Auto-set permissions and plan limits before save
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.setRolePermissions();
  }
  if (this.isModified('subscriptionPlan')) {
    this.setPlanLimits();
  }
  next();
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ businessId: 1 });

export default mongoose.model('User', userSchema);