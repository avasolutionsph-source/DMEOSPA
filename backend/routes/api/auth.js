import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import Employee from '../../models/Employee.js';
import { generateToken, verifyToken } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// POST /api/auth/register-client (for marketing website client registration)
router.post('/register-client', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    // Validate required fields (no businessName needed for clients)
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }
    
    console.log('🚀 Creating CLIENT user with data:', {
      email,
      firstName,
      lastName,
      phone,
      role: 'client'
    });
    
    // Create new CLIENT user (password will be hashed by pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      businessName: `${firstName} ${lastName}`, // Simple business name for clients
      phone: phone || '',
      role: 'client' // CLIENT ROLE
    });
    
    console.log('✅ Client user saved with role:', user.role);
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      role: user.role
    });
    
    res.json({ 
      success: true,
      message: 'Client registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Client registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Client registration failed'
    });
  }
});

// POST /api/auth/register (for business registration)
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, businessName, phone } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }
    
    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      businessName,
      phone: phone || '',
      role: 'branch'
    });
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      role: user.role
    });
    
    res.json({ 
      success: true,
      message: 'User registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
          role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Check for super admin hardcoded credentials
    if (email.toLowerCase() === 'avasolutionsph@gmail.com' && password === 'Ava12345') {
      // Create or update super admin user
      let superAdmin = user;
      if (!superAdmin) {
        superAdmin = await User.create({
          email: 'avasolutionsph@gmail.com',
          password: 'Ava12345',
          firstName: 'Super',
          lastName: 'Admin',
          businessName: 'Ava Solutions PH',
          role: 'superAdmin',
        });
      } else if (superAdmin.role !== 'superAdmin') {
        superAdmin.role = 'superAdmin';
        await superAdmin.save();
      }
      
      const token = generateToken({
        id: superAdmin._id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        businessName: superAdmin.businessName,
        role: superAdmin.role
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: superAdmin._id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          businessName: superAdmin.businessName,
          role: superAdmin.role
        }
      });
    }
    
    // Check for demo accounts
    const demoAccounts = {
      'demo@spa.com': { password: 'demo123', firstName: 'Demo', lastName: 'User', businessName: 'Demo Spa' },
      'basic@demo.com': { password: 'demo123', firstName: 'Basic', lastName: 'Demo', businessName: 'Basic Business' },
      'professional@demo.com': { password: 'demo123', firstName: 'Pro', lastName: 'Demo', businessName: 'Pro Business' },
      'enterprise@demo.com': { password: 'demo123', firstName: 'Enterprise', lastName: 'Demo', businessName: 'Enterprise Corp' }
    };
    
    const demoAccount = demoAccounts[email.toLowerCase()];
    if (demoAccount && password === demoAccount.password) {
      // Create or update demo user
      let demoUser = user;
      if (!demoUser) {
        demoUser = await User.create({
          email: email.toLowerCase(),
          password: demoAccount.password,
          firstName: demoAccount.firstName,
          lastName: demoAccount.lastName,
          businessName: demoAccount.businessName,
          role: 'branch'
        });
      }
      
      const token = generateToken({
        id: demoUser._id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        businessName: demoUser.businessName,
        role: demoUser.role
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: demoUser._id,
          email: demoUser.email,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          businessName: demoUser.businessName,
              role: demoUser.role
        }
      });
    }
    
    // Normal user authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Allow client role users to login (needed for marketing website deployed on Netlify)
    // Clients can login but have limited access to endpoints
    // if (user.role === 'client') {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Client accounts cannot access PWA backend. Please use the marketing website for bookings.'
    //   });
    // }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      role: user.role
    });
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
          role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  // Client should remove token from storage
  res.json({ 
    success: true,
    message: 'Logout successful'
  });
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Get fresh user data from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Get fresh user data from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // For now, just verify the existing token and issue a new one
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Get fresh user data
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate new token
    const newToken = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      role: user.role
    });
    
    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email address'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }
    
    // TODO: Implement email sending with reset token
    // For now, just return success
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide reset token and new password'
      });
    }
    
    // TODO: Implement token verification and password reset
    // For now, just return success
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// ============================================
// EMPLOYEE AUTHENTICATION ENDPOINTS
// ============================================

// POST /api/auth/employee/login - Employee login with branch and role detection
router.post('/employee/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }
    
    logger.info('[EMPLOYEE AUTH] Login attempt', { email });
    
    // Find employee by email
    const employee = await Employee.findOne({ 
      email: email.toLowerCase(),
      isActive: true,
      isLocked: false
    }).populate('branchId', 'businessName email');
    
    if (!employee) {
      logger.warn('[EMPLOYEE AUTH] Employee not found', { email });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check if employee has password (for login capability)
    if (!employee.password) {
      logger.warn('[EMPLOYEE AUTH] Employee has no password set', { email });
      return res.status(401).json({
        success: false,
        error: 'Please contact your branch owner to set up your login credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await employee.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      employee.loginAttempts += 1;
      if (employee.loginAttempts >= 5) {
        employee.isLocked = true;
        logger.warn('[EMPLOYEE AUTH] Account locked due to failed attempts', { email });
      }
      await employee.save();
      
      return res.status(401).json({
        success: false,
        error: employee.isLocked ? 'Account locked. Contact your branch owner.' : 'Invalid credentials'
      });
    }
    
    // Reset login attempts on successful login
    employee.loginAttempts = 0;
    employee.lastLogin = new Date();
    await employee.save();
    
    // Get permissions based on role
    const permissions = getEmployeePermissions(employee.role);
    
    // Generate JWT token with employee data
    const token = generateToken({
      id: employee._id,
      employeeId: employee._id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      branchId: employee.branchId._id,
      branchName: employee.branchId.businessName,
      userId: employee.userId, // Original branch owner ID
      permissions,
      type: 'employee' // Distinguish from owner tokens
    });
    
    logger.info('[EMPLOYEE AUTH] Login successful', {
      employeeId: employee._id,
      role: employee.role,
      branchId: employee.branchId._id
    });
    
    res.json({
      success: true,
      message: 'Employee login successful',
      token,
      user: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        branchId: employee.branchId._id,
        branchName: employee.branchId.businessName,
        permissions,
        assignedRooms: employee.assignedRooms,
        type: 'employee'
      }
    });
    
  } catch (error) {
    logger.error('[EMPLOYEE AUTH] Login error', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Employee login failed'
    });
  }
});

// POST /api/auth/employee/verify - Verify employee token
router.post('/employee/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'employee') {
      return res.status(401).json({
        success: false,
        error: 'Invalid employee token'
      });
    }
    
    // Get fresh employee data
    const employee = await Employee.findById(decoded.employeeId)
      .select('-password')
      .populate('branchId', 'businessName email');
    
    if (!employee || !employee.isActive || employee.isLocked) {
      return res.status(401).json({
        success: false,
        error: 'Employee account inactive or locked'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        branchId: employee.branchId._id,
        branchName: employee.branchId.businessName,
        permissions: getEmployeePermissions(employee.role),
        assignedRooms: employee.assignedRooms,
        type: 'employee'
      }
    });
    
  } catch (error) {
    logger.error('[EMPLOYEE AUTH] Verify error', error);
    res.status(401).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

// POST /api/auth/employee/change-password - Employee change password
router.post('/employee/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'employee') {
      return res.status(401).json({
        success: false,
        error: 'Invalid employee token'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }
    
    const employee = await Employee.findById(decoded.employeeId);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    
    // Verify current password
    const isPasswordValid = await employee.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password (will be hashed by pre-save hook)
    employee.password = newPassword;
    // Clear temporary password since employee has changed it
    employee.temporaryPassword = undefined;
    employee.isUsingTemporaryPassword = false;
    await employee.save();
    
    logger.info('[EMPLOYEE AUTH] Password changed', { employeeId: employee._id });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    logger.error('[EMPLOYEE AUTH] Change password error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Helper function to get employee permissions based on role
function getEmployeePermissions(role) {
  const rolePermissions = {
    owner: ['*'],
    manager: ['read:*'],
    senior_therapist: ['read:own_appointments', 'write:own_appointments', 'read:own_attendance', 'read:own_payroll', 'read:assigned_rooms'],
    junior_therapist: ['read:own_appointments', 'write:own_appointments', 'read:own_attendance', 'read:own_payroll', 'read:assigned_rooms'],
    new_therapist: ['read:own_appointments', 'write:own_appointments', 'read:own_attendance', 'read:own_payroll', 'read:assigned_rooms'],
    receptionist: ['read:pos', 'write:pos', 'read:inventory', 'write:inventory', 'read:customers', 'write:customers', 'read:attendance', 'write:attendance', 'read:payroll', 'read:rooms', 'read:expenses', 'write:expenses'],
    other_staff: ['read:own_attendance', 'write:own_attendance', 'read:own_payroll']
  };
  
  return rolePermissions[role] || [];
}

export default router;