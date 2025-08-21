import Analytics from '../models/Analytics.js';

// Generate sample analytics data for demonstration
export async function generateSampleAnalytics(userId, businessId) {
  try {
    const today = new Date();
    const dataPoints = [];
    
    // Generate data for the last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = i === 0;
      
      // Base multipliers for different days
      const weekendMultiplier = isWeekend ? 0.7 : 1;
      const recentMultiplier = i < 7 ? 1.2 : 1; // Recent days have higher activity
      
      // Generate realistic random data
      const baseRevenue = 5000 + Math.random() * 15000;
      const baseTransactions = 20 + Math.random() * 50;
      const baseCustomers = 15 + Math.random() * 30;
      const baseBookings = 10 + Math.random() * 25;
      
      const revenue = Math.floor(baseRevenue * weekendMultiplier * recentMultiplier);
      const transactions = Math.floor(baseTransactions * weekendMultiplier * recentMultiplier);
      const customers = Math.floor(baseCustomers * weekendMultiplier * recentMultiplier);
      const bookings = Math.floor(baseBookings * weekendMultiplier * recentMultiplier);
      
      // Generate popular services
      const services = [
        { serviceId: '1', serviceName: 'Swedish Massage', count: Math.floor(Math.random() * 8) + 2, revenue: Math.floor(revenue * 0.3) },
        { serviceId: '2', serviceName: 'Deep Tissue Massage', count: Math.floor(Math.random() * 6) + 1, revenue: Math.floor(revenue * 0.25) },
        { serviceId: '3', serviceName: 'Hot Stone Therapy', count: Math.floor(Math.random() * 5) + 1, revenue: Math.floor(revenue * 0.2) },
        { serviceId: '4', serviceName: 'Aromatherapy', count: Math.floor(Math.random() * 4) + 1, revenue: Math.floor(revenue * 0.15) },
        { serviceId: '5', serviceName: 'Reflexology', count: Math.floor(Math.random() * 3) + 1, revenue: Math.floor(revenue * 0.1) }
      ];
      
      // Generate staff performance
      const staff = [
        { staffId: '1', staffName: 'Maria Santos', hoursWorked: 8, servicesCompleted: Math.floor(Math.random() * 6) + 3, revenue: Math.floor(revenue * 0.4), customerRating: 4.8 },
        { staffId: '2', staffName: 'John Rivera', hoursWorked: 8, servicesCompleted: Math.floor(Math.random() * 5) + 2, revenue: Math.floor(revenue * 0.35), customerRating: 4.7 },
        { staffId: '3', staffName: 'Lisa Chen', hoursWorked: 6, servicesCompleted: Math.floor(Math.random() * 4) + 2, revenue: Math.floor(revenue * 0.25), customerRating: 4.9 }
      ];
      
      // Generate peak hours (more activity during afternoon and evening)
      const peakHours = [];
      for (let hour = 9; hour <= 21; hour++) {
        const isMainPeak = hour >= 14 && hour <= 18; // 2-6 PM peak
        const isSecondaryPeak = hour >= 19 && hour <= 21; // 7-9 PM secondary peak
        const bookingCount = isMainPeak ? Math.floor(Math.random() * 5) + 3 :
                           isSecondaryPeak ? Math.floor(Math.random() * 3) + 2 :
                           Math.floor(Math.random() * 2) + 1;
        
        if (bookingCount > 1) {
          peakHours.push({ hour, bookingCount });
        }
      }
      
      const analyticsData = {
        userId,
        businessId,
        date,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        dayOfWeek: date.getDay(),
        
        revenue: {
          totalSales: revenue,
          totalTransactions: transactions,
          averageTransactionValue: Math.floor(revenue / Math.max(transactions, 1)),
          cashSales: Math.floor(revenue * 0.4),
          cardSales: Math.floor(revenue * 0.5),
          digitalWalletSales: Math.floor(revenue * 0.1),
          refunds: Math.floor(revenue * 0.02),
          discounts: Math.floor(revenue * 0.05)
        },
        
        customers: {
          totalCustomers: customers,
          newCustomers: Math.floor(customers * 0.3),
          returningCustomers: Math.floor(customers * 0.7),
          customerRetentionRate: 65 + Math.random() * 20,
          averageCustomerValue: Math.floor(revenue / Math.max(customers, 1)),
          customerLifetimeValue: Math.floor(revenue * 3.5)
        },
        
        services: {
          totalServicesProvided: services.reduce((sum, s) => sum + s.count, 0),
          popularServices: services,
          averageServiceDuration: 75 + Math.random() * 30,
          serviceUtilizationRate: 70 + Math.random() * 25
        },
        
        bookings: {
          totalBookings: bookings,
          confirmedBookings: Math.floor(bookings * 0.85),
          cancelledBookings: Math.floor(bookings * 0.1),
          noShowBookings: Math.floor(bookings * 0.05),
          onlineBookings: Math.floor(bookings * 0.6),
          walkInBookings: Math.floor(bookings * 0.4),
          bookingConversionRate: 80 + Math.random() * 15,
          averageBookingValue: Math.floor(revenue / Math.max(bookings, 1)),
          peakHours
        },
        
        staff: {
          totalStaffHours: staff.reduce((sum, s) => sum + s.hoursWorked, 0),
          productiveHours: staff.reduce((sum, s) => sum + s.hoursWorked * 0.85, 0),
          utilization: 75 + Math.random() * 20,
          staffPerformance: staff
        },
        
        inventory: {
          topSellingProducts: [
            { productId: '1', productName: 'Massage Oil', quantitySold: Math.floor(Math.random() * 10) + 5, revenue: Math.floor(revenue * 0.1) },
            { productId: '2', productName: 'Aromatherapy Candles', quantitySold: Math.floor(Math.random() * 8) + 3, revenue: Math.floor(revenue * 0.08) },
            { productId: '3', productName: 'Hot Stones', quantitySold: Math.floor(Math.random() * 5) + 2, revenue: Math.floor(revenue * 0.05) }
          ],
          lowStockItems: Math.floor(Math.random() * 3),
          stockTurnoverRate: 2.5 + Math.random() * 2,
          inventoryValue: 50000 + Math.random() * 30000
        },
        
        operations: {
          businessHours: 12,
          occupancyRate: 60 + Math.random() * 30,
          averageWaitTime: 10 + Math.random() * 15,
          customerSatisfactionScore: 4.2 + Math.random() * 0.7,
          systemUptime: 98 + Math.random() * 2,
          apiCalls: 100 + Math.random() * 200
        },
        
        marketing: {
          websiteVisits: Math.floor(Math.random() * 100) + 50,
          bookingPageViews: Math.floor(Math.random() * 80) + 30,
          conversionRate: 15 + Math.random() * 20,
          socialMediaEngagement: Math.floor(Math.random() * 50) + 10,
          referralCount: Math.floor(Math.random() * 5) + 1
        },
        
        dataSource: 'sample'
      };
      
      dataPoints.push(analyticsData);
    }
    
    // Save all data points
    for (const dataPoint of dataPoints) {
      await Analytics.updateDailyAnalytics(
        dataPoint.userId,
        dataPoint.businessId,
        dataPoint
      );
    }
    
    console.log(`✅ Generated ${dataPoints.length} days of sample analytics data for user ${userId}`);
    return dataPoints;
    
  } catch (error) {
    console.error('Error generating sample analytics:', error);
    throw error;
  }
}

// Function to clear existing sample data
export async function clearSampleAnalytics(userId) {
  try {
    await Analytics.deleteMany({
      userId,
      dataSource: 'sample'
    });
    console.log(`🗑️ Cleared sample analytics data for user ${userId}`);
  } catch (error) {
    console.error('Error clearing sample analytics:', error);
    throw error;
  }
}