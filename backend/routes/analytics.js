import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import { checkPlanLimit } from '../middleware/planLimits.js';
import Analytics from '../models/Analytics.js';
import User from '../models/User.js';
import { generateSampleAnalytics, clearSampleAnalytics } from '../utils/sampleDataSeeder.js';

const router = express.Router();

// Get dashboard overview analytics
router.get('/dashboard', protect, checkPermission('analytics'), async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Get today's analytics
    const todayAnalytics = await Analytics.findOne({
      userId,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    });
    
    // Get yesterday's analytics for comparison
    const yesterdayAnalytics = await Analytics.findOne({
      userId,
      year: yesterday.getFullYear(),
      month: yesterday.getMonth() + 1,
      day: yesterday.getDate()
    });
    
    // Get monthly analytics
    const monthlyAnalytics = await Analytics.getMonthlyAnalytics(
      userId,
      today.getFullYear(),
      today.getMonth() + 1
    );
    
    // Get last 7 days for trends
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyTrend = await Analytics.getAnalyticsRange(
      userId,
      sevenDaysAgo,
      today
    );
    
    // Calculate key metrics
    const currentMetrics = {
      revenue: {
        today: todayAnalytics?.revenue.totalSales || 0,
        yesterday: yesterdayAnalytics?.revenue.totalSales || 0,
        thisMonth: monthlyAnalytics[0]?.totalRevenue || 0,
        change: calculatePercentageChange(
          todayAnalytics?.revenue.totalSales || 0,
          yesterdayAnalytics?.revenue.totalSales || 0
        )
      },
      transactions: {
        today: todayAnalytics?.revenue.totalTransactions || 0,
        yesterday: yesterdayAnalytics?.revenue.totalTransactions || 0,
        thisMonth: monthlyAnalytics[0]?.totalTransactions || 0,
        change: calculatePercentageChange(
          todayAnalytics?.revenue.totalTransactions || 0,
          yesterdayAnalytics?.revenue.totalTransactions || 0
        )
      },
      customers: {
        today: todayAnalytics?.customers.totalCustomers || 0,
        yesterday: yesterdayAnalytics?.customers.totalCustomers || 0,
        thisMonth: monthlyAnalytics[0]?.totalCustomers || 0,
        new: todayAnalytics?.customers.newCustomers || 0,
        change: calculatePercentageChange(
          todayAnalytics?.customers.totalCustomers || 0,
          yesterdayAnalytics?.customers.totalCustomers || 0
        )
      },
      bookings: {
        today: todayAnalytics?.bookings.totalBookings || 0,
        yesterday: yesterdayAnalytics?.bookings.totalBookings || 0,
        thisMonth: monthlyAnalytics[0]?.totalBookings || 0,
        confirmed: todayAnalytics?.bookings.confirmedBookings || 0,
        cancelled: todayAnalytics?.bookings.cancelledBookings || 0,
        change: calculatePercentageChange(
          todayAnalytics?.bookings.totalBookings || 0,
          yesterdayAnalytics?.bookings.totalBookings || 0
        )
      }
    };
    
    // Format weekly trend data
    const trendData = weeklyTrend.map(day => ({
      date: day.date,
      revenue: day.revenue.totalSales,
      customers: day.customers.totalCustomers,
      bookings: day.bookings.totalBookings
    }));
    
    res.json({
      success: true,
      metrics: currentMetrics,
      trends: trendData,
      topServices: todayAnalytics?.services.popularServices?.slice(0, 5) || [],
      peakHours: todayAnalytics?.bookings.peakHours || [],
      staffPerformance: todayAnalytics?.staff.staffPerformance?.slice(0, 5) || []
    });
    
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics'
    });
  }
});

// Get detailed analytics for a specific date range
router.get('/range', protect, checkPermission('analytics'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const analytics = await Analytics.getAnalyticsRange(userId, startDate, endDate);
    
    let groupedData;
    switch (groupBy) {
      case 'day':
        groupedData = analytics;
        break;
      case 'week':
        groupedData = groupAnalyticsByWeek(analytics);
        break;
      case 'month':
        groupedData = groupAnalyticsByMonth(analytics);
        break;
      default:
        groupedData = analytics;
    }
    
    res.json({
      success: true,
      data: groupedData,
      summary: calculateSummary(analytics)
    });
    
  } catch (error) {
    console.error('Range analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics range'
    });
  }
});

// Get revenue analytics
router.get('/revenue', protect, checkPlanLimit('advancedReports'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    const analytics = await Analytics.getAnalyticsRange(userId, startDate, endDate);
    
    const revenueData = analytics.map(day => ({
      date: day.date,
      totalSales: day.revenue.totalSales,
      cashSales: day.revenue.cashSales,
      cardSales: day.revenue.cardSales,
      digitalWalletSales: day.revenue.digitalWalletSales,
      refunds: day.revenue.refunds,
      discounts: day.revenue.discounts,
      transactions: day.revenue.totalTransactions,
      averageTransaction: day.revenue.averageTransactionValue
    }));
    
    const summary = {
      totalRevenue: analytics.reduce((sum, day) => sum + day.revenue.totalSales, 0),
      totalTransactions: analytics.reduce((sum, day) => sum + day.revenue.totalTransactions, 0),
      averageDaily: analytics.length > 0 ? 
        analytics.reduce((sum, day) => sum + day.revenue.totalSales, 0) / analytics.length : 0,
      totalRefunds: analytics.reduce((sum, day) => sum + day.revenue.refunds, 0),
      totalDiscounts: analytics.reduce((sum, day) => sum + day.revenue.discounts, 0)
    };
    
    res.json({
      success: true,
      period,
      data: revenueData,
      summary
    });
    
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
});

// Get customer analytics
router.get('/customers', protect, checkPlanLimit('advancedReports'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'month' } = req.query;
    
    const analytics = await getAnalyticsForPeriod(userId, period);
    
    const customerData = analytics.map(day => ({
      date: day.date,
      totalCustomers: day.customers.totalCustomers,
      newCustomers: day.customers.newCustomers,
      returningCustomers: day.customers.returningCustomers,
      retentionRate: day.customers.customerRetentionRate,
      averageValue: day.customers.averageCustomerValue
    }));
    
    const summary = {
      totalCustomers: Math.max(...analytics.map(day => day.customers.totalCustomers)) || 0,
      newCustomers: analytics.reduce((sum, day) => sum + day.customers.newCustomers, 0),
      averageRetention: analytics.length > 0 ?
        analytics.reduce((sum, day) => sum + day.customers.customerRetentionRate, 0) / analytics.length : 0,
      customerGrowth: calculateGrowthRate(analytics.map(day => day.customers.totalCustomers))
    };
    
    res.json({
      success: true,
      period,
      data: customerData,
      summary
    });
    
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer analytics'
    });
  }
});

// Update analytics (for API integrations)
router.post('/update', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const businessId = req.user.businessId || userId.toString();
    const { analyticsData } = req.body;
    
    if (!analyticsData) {
      return res.status(400).json({
        success: false,
        message: 'Analytics data is required'
      });
    }
    
    const updated = await Analytics.updateDailyAnalytics(
      userId,
      businessId,
      analyticsData
    );
    
    // Update user's business metrics
    await User.findByIdAndUpdate(userId, {
      'businessMetrics.lastSyncDate': new Date(),
      'businessMetrics.totalSales': analyticsData.revenue?.totalSales || 0,
      'businessMetrics.totalTransactions': analyticsData.revenue?.totalTransactions || 0
    });
    
    res.json({
      success: true,
      message: 'Analytics updated successfully',
      data: updated.dailySummary
    });
    
  } catch (error) {
    console.error('Analytics update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update analytics'
    });
  }
});

// Helper functions
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateGrowthRate(values) {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  return calculatePercentageChange(last, first);
}

function calculateSummary(analytics) {
  if (analytics.length === 0) return null;
  
  return {
    totalRevenue: analytics.reduce((sum, day) => sum + day.revenue.totalSales, 0),
    totalTransactions: analytics.reduce((sum, day) => sum + day.revenue.totalTransactions, 0),
    totalCustomers: Math.max(...analytics.map(day => day.customers.totalCustomers)),
    totalBookings: analytics.reduce((sum, day) => sum + day.bookings.totalBookings, 0),
    averageDaily: {
      revenue: analytics.reduce((sum, day) => sum + day.revenue.totalSales, 0) / analytics.length,
      transactions: analytics.reduce((sum, day) => sum + day.revenue.totalTransactions, 0) / analytics.length,
      bookings: analytics.reduce((sum, day) => sum + day.bookings.totalBookings, 0) / analytics.length
    }
  };
}

function groupAnalyticsByWeek(analytics) {
  // Group analytics by week
  const weeks = {};
  
  analytics.forEach(day => {
    const week = getWeekNumber(day.date);
    const key = `${day.year}-W${week}`;
    
    if (!weeks[key]) {
      weeks[key] = {
        week: key,
        revenue: 0,
        transactions: 0,
        customers: 0,
        bookings: 0,
        days: []
      };
    }
    
    weeks[key].revenue += day.revenue.totalSales;
    weeks[key].transactions += day.revenue.totalTransactions;
    weeks[key].customers = Math.max(weeks[key].customers, day.customers.totalCustomers);
    weeks[key].bookings += day.bookings.totalBookings;
    weeks[key].days.push(day);
  });
  
  return Object.values(weeks);
}

function groupAnalyticsByMonth(analytics) {
  // Group analytics by month
  const months = {};
  
  analytics.forEach(day => {
    const key = `${day.year}-${String(day.month).padStart(2, '0')}`;
    
    if (!months[key]) {
      months[key] = {
        month: key,
        revenue: 0,
        transactions: 0,
        customers: 0,
        bookings: 0,
        days: []
      };
    }
    
    months[key].revenue += day.revenue.totalSales;
    months[key].transactions += day.revenue.totalTransactions;
    months[key].customers = Math.max(months[key].customers, day.customers.totalCustomers);
    months[key].bookings += day.bookings.totalBookings;
    months[key].days.push(day);
  });
  
  return Object.values(months);
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

async function getAnalyticsForPeriod(userId, period) {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  return await Analytics.getAnalyticsRange(userId, startDate, now);
}

// Generate sample data (for testing/demo purposes)
router.post('/generate-sample-data', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const businessId = req.user.businessId || userId.toString();
    
    // Clear existing sample data first
    await clearSampleAnalytics(userId);
    
    // Generate new sample data
    const dataPoints = await generateSampleAnalytics(userId, businessId);
    
    res.json({
      success: true,
      message: 'Sample analytics data generated successfully',
      dataPoints: dataPoints.length
    });
    
  } catch (error) {
    console.error('Sample data generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sample data'
    });
  }
});

// Clear sample data
router.delete('/sample-data', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    await clearSampleAnalytics(userId);
    
    res.json({
      success: true,
      message: 'Sample analytics data cleared successfully'
    });
    
  } catch (error) {
    console.error('Sample data clearing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear sample data'
    });
  }
});

export default router;