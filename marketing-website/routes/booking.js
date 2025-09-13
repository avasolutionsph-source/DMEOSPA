import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
// NOTE: Removed duplicate Product and Employee imports - now using unified backend API

const router = express.Router();

// Middleware to verify client authentication
const requireAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.authToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Get all branches available for booking
router.get('/branches', async (req, res) => {
  try {
    // Fetch real branch users from database
    const branches = await User.find(
      { role: 'branch' },
      'businessName firstName lastName email phone businessMetrics address'
    ).sort({ businessName: 1 });

    const formattedBranches = branches.map(branch => ({
      id: branch._id,
      name: branch.businessName || `${branch.firstName} ${branch.lastName}`,
      contact: {
        email: branch.email,
        phone: branch.phone
      },
      isActive: branch.businessMetrics?.lastActiveDate ? 
        (new Date() - new Date(branch.businessMetrics.lastActiveDate)) < (30 * 24 * 60 * 60 * 1000) : true,
      address: branch.address || {
        city: 'Daet',
        province: 'Camarines Norte'
      }
    }));

    console.log(`Found ${formattedBranches.length} branch accounts for booking`);

    res.json({
      success: true,
      branches: formattedBranches
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

// Get services for a specific branch
router.get('/branches/:branchId/services', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Get branch details
    const branch = await User.findById(branchId, 'businessName firstName lastName');
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    console.log('Looking for products for branch:', branchId);

    // 🔄 Call public products API for booking system (no authentication required)
    console.log('🔄 Fetching products from public booking API for branch:', branchId);
    let products = [];
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4001';
      const response = await fetch(`${backendUrl}/api/products/public/${branchId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        products = result.data || [];
        console.log('✅ Found products from unified backend:', products.length);
      } else {
        console.warn('⚠️ Backend API call failed:', response.status, response.statusText);
        // Fallback: Return empty array instead of crashing
        products = [];
      }
    } catch (error) {
      console.error('❌ Error calling unified backend API:', error.message);
      products = [];
    }
    
    // Filter products to only show services available for booking (not restricted by POS settings)
    // For booking system, we show ALL active services regardless of showInPOS setting
    // since customers should be able to book any service offered by the spa
    const availableProducts = (products || []).filter(product => 
      product.isActive !== false // Only filter out explicitly inactive services
    );
    
    // Map products to services format (with null check)
    const services = availableProducts.map(product => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description || `Professional ${product.category} service`,
      category: product.category,
      duration: product.duration || 60,
      price: product.price,
      available: product.isActive,
      // Include showInPOS info for debugging but don't filter by it
      showInPOS: product.showInPOS
    }));
    
    console.log('Mapped services:', services);
    
    res.json({
      success: true,
      branchName: branch.businessName || `${branch.firstName} ${branch.lastName}`,
      services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

// Get therapists for a specific branch
router.get('/branches/:branchId/therapists', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Get branch details
    const branch = await User.findById(branchId, 'businessName firstName lastName');
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // 🔄 Call public employees API for booking system (no authentication required)
    console.log('🔄 Fetching employees from public booking API for branch:', branchId);
    let employees = [];
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4001';
      const response = await fetch(`${backendUrl}/api/employees/public/${branchId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        employees = result.data || [];
        console.log('✅ Found employees from unified backend:', employees.length);
      } else {
        console.warn('⚠️ Backend API call failed:', response.status, response.statusText);
        // Fallback: Return empty array instead of crashing
        employees = [];
      }
    } catch (error) {
      console.error('❌ Error calling unified backend API:', error.message);
      employees = [];
    }
    
    // Map employees to therapists format (handle both name structures)
    const therapists = employees.map(employee => ({
      id: employee._id?.toString() || employee.id,
      // Handle both name structures: unified backend uses firstName/lastName, PWA uses name
      name: employee.firstName ? `${employee.firstName} ${employee.lastName}` : employee.name,
      position: employee.position || 'Spa Therapist',
      experience: `Professional since ${employee.hireDate ? new Date(employee.hireDate).getFullYear() : 'recent'}`,
      rating: 4.5 + (Math.random() * 0.5), // Random rating between 4.5-5.0
      specialties: ['Massage', 'Wellness', 'Relaxation'],
      available: employee.isActive !== false // Default to available if not specified
    }));
    
    console.log('Mapped therapists:', therapists);
    
    res.json({
      success: true,
      branchName: branch.businessName || `${branch.firstName} ${branch.lastName}`,
      therapists
    });
  } catch (error) {
    console.error('Error fetching therapists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
  }
});

// Check availability for a specific therapist on a date
router.get('/availability/:branchId/:therapistId/:date', async (req, res) => {
  try {
    const { branchId, therapistId, date } = req.params;
    
    // Get existing bookings for the therapist on this date
    const existingBookings = await Booking.find({
      branchId,
      therapistId,
      appointmentDate: new Date(date),
      status: { $in: ['pending', 'confirmed', 'in-progress'] }
    }).select('startTime endTime');

    console.log(`Checking availability for Therapist ${therapistId} on ${date}:`, existingBookings.length, 'bookings found');

    // Generate all possible time slots (9 AM to 8 PM)
    const allTimeSlots = [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
      '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'
    ];
    
    // Get taken time slots from existing bookings for THIS SPECIFIC THERAPIST
    const takenSlots = existingBookings.map(booking => booking.startTime);
    console.log(`Therapist ${therapistId} taken slots on ${date}:`, takenSlots);
    
    // Create slot objects with availability status based on real bookings only
    const timeSlots = allTimeSlots.map(slot => ({
      time: slot,
      available: !takenSlots.includes(slot)
    }));

    console.log(`Final availability for Therapist ${therapistId} on ${date}:`, timeSlots.map(s => `${s.time}:${s.available ? 'AVAILABLE' : 'TAKEN'}`));

    res.json({
      success: true,
      date,
      timeSlots, // Return all slots with availability status
      availableSlots: timeSlots.filter(slot => slot.available).map(slot => slot.time) // Keep backward compatibility
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// Create a new booking
router.post('/book', requireAuth, [
  body('branchId').isMongoId().withMessage('Valid branch ID required'),
  body('serviceId').notEmpty().withMessage('Service ID required'),
  body('therapistId').notEmpty().withMessage('Therapist ID required'),
  body('appointmentDate').isISO8601().withMessage('Valid date required'),
  body('startTime').matches(/^(1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)$/i).withMessage('Valid time required (e.g., 9:00 AM)'),
  body('serviceLocation').isIn(['in-spa', 'home-service']).withMessage('Valid service location required'),
  body('clientPhone').isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      branchId,
      serviceId,
      serviceName,
      serviceDuration,
      servicePrice,
      serviceCategory,
      therapistId,
      therapistName,
      appointmentDate,
      startTime,
      serviceLocation,
      homeAddress,
      specialRequests,
      clientPhone
    } = req.body;

    // Check if therapist is available
    const endTime = Booking.calculateEndTime(startTime, serviceDuration || 60);
    const isAvailable = await Booking.isTherapistAvailable(
      therapistId, 
      new Date(appointmentDate), 
      startTime, 
      serviceDuration || 60
    );

    if (!isAvailable) {
      return res.status(400).json({ error: 'Time slot not available' });
    }

    // Get branch info
    const branch = await User.findById(branchId, 'businessName');
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Get client info
    const client = await User.findById(req.user.userId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Create booking
    const booking = new Booking({
      clientId: client._id,
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email,
      clientPhone,
      branchId,
      branchName: branch.businessName,
      serviceId,
      serviceName,
      serviceDuration: serviceDuration || 60,
      servicePrice,
      serviceCategory,
      therapistId,
      therapistName,
      appointmentDate: new Date(appointmentDate),
      startTime,
      endTime,
      serviceLocation,
      homeAddress: serviceLocation === 'home-service' ? homeAddress : null,
      specialRequests,
      bookingSource: 'website'
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        branchName: booking.branchName,
        serviceName: booking.serviceName,
        therapistName: booking.therapistName,
        appointmentDate: booking.appointmentDate,
        startTime: booking.startTime,
        serviceLocation: booking.serviceLocation,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle duplicate booking error (race condition caught at database level)
    if (error.code === 11000 && error.keyPattern && 
        error.keyPattern.therapistId && error.keyPattern.appointmentDate && 
        error.keyPattern.startTime) {
      return res.status(409).json({ 
        error: 'This time slot has already been booked by another client. Please select a different time.',
        errorCode: 'TIME_SLOT_TAKEN'
      });
    }
    
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get client's bookings
router.get('/my-bookings', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ clientId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Cancel a booking
router.patch('/cancel/:bookingId', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findOne({ 
      _id: bookingId, 
      clientId: req.user.userId 
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.canBeCancelled()) {
      return res.status(400).json({ 
        error: 'Booking cannot be cancelled. Must be cancelled at least 2 hours before appointment.' 
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.userId;

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ADMIN ROUTES - Booking Management

// Middleware to verify admin authentication
const requireAdmin = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.authToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin or superAdmin
    if (decoded.role !== 'superAdmin' && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// GET /api/admin/booking-stats - Get booking statistics
router.get('/admin/booking-stats', requireAdmin, async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObject = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    stats.forEach(stat => {
      if (statsObject.hasOwnProperty(stat._id)) {
        statsObject[stat._id] = stat.count;
      }
    });

    res.json({
      success: true,
      ...statsObject
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ error: 'Failed to fetch booking statistics' });
  }
});

// GET /api/admin/all-bookings - Get all bookings for admin
router.get('/admin/all-bookings', requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PATCH /api/admin/bookings/:id/confirm - Confirm a booking
router.patch('/admin/bookings/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: 'confirmed',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: {
        id: booking._id,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

// PATCH /api/admin/bookings/:id/cancel - Cancel a booking (admin)
router.patch('/admin/bookings/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason, cancelledBy } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: 'cancelled',
        cancellationReason: cancellationReason || 'Cancelled by admin',
        cancelledBy: cancelledBy || 'admin',
        cancelledAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// BRANCH ROUTES - Branch-specific Booking Management

// Middleware to verify branch authentication
const requireBranchAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.authToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set user with proper ID mapping
    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id
    };
    
    console.log('Branch auth - User:', { id: req.user.id, role: req.user.role, userId: decoded.userId });
    next();
  } catch (error) {
    console.error('Branch auth error:', error);
    res.status(400).json({ error: 'Invalid token' });
  }
};

// GET /api/booking/branch-bookings/:branchId - Get bookings for specific branch
router.get('/branch-bookings/:branchId', requireBranchAuth, async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Ensure user can only access their own branch bookings (unless admin)
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin' && req.user.id !== branchId) {
      console.log('Access denied - User ID:', req.user.id, 'Branch ID:', branchId, 'Role:', req.user.role);
      return res.status(403).json({ error: 'Access denied. Can only view your own branch bookings.' });
    }
    
    console.log('Access granted - User ID:', req.user.id, 'Branch ID:', branchId);

    const bookings = await Booking.find({ branchId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching branch bookings:', error);
    res.status(500).json({ error: 'Failed to fetch branch bookings' });
  }
});

// PATCH /api/booking/:id/confirm - Confirm a booking (branch owner)
router.patch('/:id/confirm', requireBranchAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the booking first to check ownership
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure user can only confirm their own branch bookings (unless admin)
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin' && req.user.id !== booking.branchId) {
      return res.status(403).json({ error: 'Access denied. Can only confirm your own branch bookings.' });
    }

    booking.status = 'confirmed';
    booking.updatedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: {
        id: booking._id,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

// PATCH /api/booking/:id/cancel - Cancel a booking (branch owner)
router.patch('/:id/cancel', requireBranchAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason, cancelledBy } = req.body;

    // Find the booking first to check ownership
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure user can only cancel their own branch bookings (unless admin)
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin' && req.user.id !== booking.branchId) {
      return res.status(403).json({ error: 'Access denied. Can only cancel your own branch bookings.' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason || 'Cancelled by branch';
    booking.cancelledBy = cancelledBy || 'branch';
    booking.cancelledAt = new Date();
    booking.updatedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;