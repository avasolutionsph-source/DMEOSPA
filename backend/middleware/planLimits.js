import User from '../models/User.js';

// Middleware to check if user can perform specific actions based on their plan
export const checkPlanLimit = (action) => {
  return async (req, res, next) => {
    try {
      // Get user from auth middleware (assumes auth middleware sets req.user)
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Get fresh user data with latest usage stats
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Check if user can perform the action
      const actionCheck = user.canPerformAction(action, req.body);
      
      if (!actionCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: actionCheck.reason,
          planLimits: user.planLimits,
          currentUsage: user.currentUsage,
          subscriptionPlan: user.subscriptionPlan,
          upgradeRequired: true
        });
      }

      // If allowed, update user object in request for further use
      req.user = user;
      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  };
};

// Middleware to update usage counts after successful operations
export const updateUsageCount = (type) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only update usage if the operation was successful
      if (data && data.success !== false && res.statusCode < 400) {
        updateUserUsage(req.user._id, type).catch(err => {
          console.error('Failed to update usage count:', err);
        });
      }
      
      // Call original res.json
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Helper function to update user usage statistics
async function updateUserUsage(userId, type) {
  try {
    const updateQuery = {};
    const now = new Date();
    
    switch (type) {
      case 'customer':
        updateQuery['$inc'] = { 'currentUsage.customersCount': 1 };
        break;
      case 'employee':
        updateQuery['$inc'] = { 'currentUsage.employeesCount': 1 };
        break;
      case 'product':
        updateQuery['$inc'] = { 'currentUsage.productsCount': 1 };
        break;
      case 'booking':
        updateQuery['$inc'] = { 'currentUsage.bookingsThisMonth': 1 };
        break;
    }
    
    updateQuery['currentUsage.lastUpdated'] = now;
    
    await User.findByIdAndUpdate(userId, updateQuery);
  } catch (error) {
    console.error('Error updating usage:', error);
  }
}

// Middleware to get plan status and limits for frontend
export const getPlanStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      plan: {
        name: user.subscriptionPlan,
        status: user.subscriptionStatus,
        limits: user.planLimits,
        usage: user.currentUsage,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt
      }
    });
  } catch (error) {
    console.error('Error getting plan status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Function to reset monthly counters (should be called via cron job)
export const resetMonthlyUsage = async () => {
  try {
    await User.updateMany(
      {},
      { 
        $set: { 
          'currentUsage.bookingsThisMonth': 0,
          'currentUsage.lastUpdated': new Date()
        } 
      }
    );
    console.log('Monthly usage counters reset successfully');
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
  }
};