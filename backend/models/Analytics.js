import mongoose from 'mongoose';

// Schema for tracking daily analytics data
const analyticsSchema = new mongoose.Schema({
  // Business identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: String,
    required: true,
    index: true
  },
  
  // Date tracking
  date: {
    type: Date,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    index: true
  },
  day: {
    type: Number,
    required: true
  },
  dayOfWeek: {
    type: Number,
    required: true // 0 = Sunday, 1 = Monday, etc.
  },
  
  // Revenue metrics
  revenue: {
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    averageTransactionValue: { type: Number, default: 0 },
    cashSales: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    digitalWalletSales: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    discounts: { type: Number, default: 0 }
  },
  
  // Customer metrics
  customers: {
    totalCustomers: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 },
    returningCustomers: { type: Number, default: 0 },
    customerRetentionRate: { type: Number, default: 0 },
    averageCustomerValue: { type: Number, default: 0 },
    customerLifetimeValue: { type: Number, default: 0 }
  },
  
  // Service/Product metrics
  services: {
    totalServicesProvided: { type: Number, default: 0 },
    popularServices: [{
      serviceId: String,
      serviceName: String,
      count: Number,
      revenue: Number
    }],
    averageServiceDuration: { type: Number, default: 0 },
    serviceUtilizationRate: { type: Number, default: 0 }
  },
  
  // Booking metrics
  bookings: {
    totalBookings: { type: Number, default: 0 },
    confirmedBookings: { type: Number, default: 0 },
    cancelledBookings: { type: Number, default: 0 },
    noShowBookings: { type: Number, default: 0 },
    onlineBookings: { type: Number, default: 0 },
    walkInBookings: { type: Number, default: 0 },
    bookingConversionRate: { type: Number, default: 0 },
    averageBookingValue: { type: Number, default: 0 },
    peakHours: [{
      hour: Number,
      bookingCount: Number
    }]
  },
  
  // Staff metrics
  staff: {
    totalStaffHours: { type: Number, default: 0 },
    productiveHours: { type: Number, default: 0 },
    utilization: { type: Number, default: 0 },
    staffPerformance: [{
      staffId: String,
      staffName: String,
      hoursWorked: Number,
      servicesCompleted: Number,
      revenue: Number,
      customerRating: Number
    }]
  },
  
  // Inventory metrics
  inventory: {
    topSellingProducts: [{
      productId: String,
      productName: String,
      quantitySold: Number,
      revenue: Number
    }],
    lowStockItems: Number,
    stockTurnoverRate: { type: Number, default: 0 },
    inventoryValue: { type: Number, default: 0 }
  },
  
  // Operational metrics
  operations: {
    businessHours: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 },
    averageWaitTime: { type: Number, default: 0 },
    customerSatisfactionScore: { type: Number, default: 0 },
    systemUptime: { type: Number, default: 100 },
    apiCalls: { type: Number, default: 0 }
  },
  
  // Marketing metrics
  marketing: {
    websiteVisits: { type: Number, default: 0 },
    bookingPageViews: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    socialMediaEngagement: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },
    promotionUsage: [{
      promotionId: String,
      promotionName: String,
      usageCount: Number,
      discountAmount: Number
    }]
  },
  
  // Comparison metrics
  comparison: {
    previousDayChange: {
      revenue: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 }
    },
    previousWeekChange: {
      revenue: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 }
    },
    previousMonthChange: {
      revenue: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 }
    }
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  dataSource: {
    type: String,
    enum: ['pos', 'booking', 'manual', 'import', 'api'],
    default: 'api'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsSchema.index({ userId: 1, date: -1 });
analyticsSchema.index({ userId: 1, year: -1, month: -1 });
analyticsSchema.index({ userId: 1, year: -1, month: -1, day: -1 });
analyticsSchema.index({ businessId: 1, date: -1 });

// Static method to create or update daily analytics
analyticsSchema.statics.updateDailyAnalytics = async function(userId, businessId, analyticsData) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dayOfWeek = today.getDay();
  
  const filter = {
    userId,
    businessId,
    year,
    month,
    day
  };
  
  const update = {
    ...analyticsData,
    date: new Date(year, month - 1, day),
    year,
    month,
    day,
    dayOfWeek,
    lastUpdated: new Date()
  };
  
  return await this.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });
};

// Static method to get analytics for a date range
analyticsSchema.statics.getAnalyticsRange = async function(userId, startDate, endDate) {
  return await this.find({
    userId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: 1 });
};

// Static method to get monthly analytics summary
analyticsSchema.statics.getMonthlyAnalytics = async function(userId, year, month) {
  return await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        year: year,
        month: month
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$revenue.totalSales' },
        totalTransactions: { $sum: '$revenue.totalTransactions' },
        totalCustomers: { $sum: '$customers.totalCustomers' },
        newCustomers: { $sum: '$customers.newCustomers' },
        totalBookings: { $sum: '$bookings.totalBookings' },
        averageTransactionValue: { $avg: '$revenue.averageTransactionValue' },
        days: { $push: '$$ROOT' }
      }
    }
  ]);
};

// Virtual for getting analytics summary
analyticsSchema.virtual('dailySummary').get(function() {
  return {
    revenue: this.revenue.totalSales,
    transactions: this.revenue.totalTransactions,
    customers: this.customers.totalCustomers,
    bookings: this.bookings.totalBookings,
    date: this.date
  };
});

export default mongoose.model('Analytics', analyticsSchema);