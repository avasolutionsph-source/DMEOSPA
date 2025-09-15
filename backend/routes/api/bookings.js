import express from 'express';
import Booking from '../../models/Booking.js';
import { authenticateJWT } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Create a new booking (public endpoint for customers)
router.post('/create', async (req, res) => {
    try {
        const bookingData = req.body;
        
        // If user is authenticated, use their ID
        if (req.user) {
            bookingData.clientId = req.user._id || req.user.id;
        }
        
        // Calculate end time based on duration
        if (bookingData.startTime && bookingData.serviceDuration) {
            bookingData.endTime = Booking.calculateEndTime(bookingData.startTime, bookingData.serviceDuration);
        }
        
        // Create the booking
        const booking = new Booking(bookingData);
        await booking.save();
        
        logger.info('New booking created', {
            bookingId: booking._id,
            branchId: booking.branchId,
            serviceName: booking.serviceName,
            appointmentDate: booking.appointmentDate
        });
        
        res.status(201).json({
            success: true,
            data: booking,
            message: 'Booking created successfully'
        });
    } catch (error) {
        logger.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create booking'
        });
    }
});

// Get bookings for a specific branch (authenticated)
router.get('/branch/:branchId', authenticateJWT, async (req, res) => {
    try {
        const { branchId } = req.params;
        const { status, date, page = 1, limit = 20 } = req.query;
        
        // Build query
        const query = { branchId };
        
        if (status) {
            query.status = status;
        }
        
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.appointmentDate = { $gte: startDate, $lte: endDate };
        }
        
        // Execute query with pagination
        const skip = (page - 1) * limit;
        const bookings = await Booking.find(query)
            .sort({ appointmentDate: 1, startTime: 1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Booking.countDocuments(query);
        
        res.json({
            success: true,
            data: bookings,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching branch bookings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bookings'
        });
    }
});

// Get bookings for a specific client (authenticated)
router.get('/client/:clientId', authenticateJWT, async (req, res) => {
    try {
        const { clientId } = req.params;
        
        // Verify user can only see their own bookings unless they're admin
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && 
            req.user._id.toString() !== clientId && req.user.id !== clientId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        
        const bookings = await Booking.find({ clientId })
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: bookings
        });
    } catch (error) {
        logger.error('Error fetching client bookings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bookings'
        });
    }
});

// Update booking status
router.patch('/:bookingId/status', authenticateJWT, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, notes } = req.body;
        
        const booking = await Booking.findById(bookingId);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        // Update status
        booking.status = status;
        if (notes) {
            booking.adminNotes = notes;
        }
        
        // Handle cancellation
        if (status === 'cancelled') {
            booking.cancelledAt = new Date();
            booking.cancelledBy = req.user._id || req.user.id;
            booking.cancellationReason = req.body.cancellationReason || 'Cancelled by admin';
        }
        
        await booking.save();
        
        logger.info('Booking status updated', {
            bookingId,
            oldStatus: booking.status,
            newStatus: status,
            updatedBy: req.user._id || req.user.id
        });
        
        res.json({
            success: true,
            data: booking,
            message: `Booking status updated to ${status}`
        });
    } catch (error) {
        logger.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update booking status'
        });
    }
});

// Check availability for a therapist
router.get('/availability/:therapistId', async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }
        
        const appointmentDate = new Date(date);
        appointmentDate.setHours(0, 0, 0, 0);
        
        // Get all bookings for the therapist on that date
        const bookings = await Booking.find({
            therapistId,
            appointmentDate,
            status: { $in: ['pending', 'confirmed', 'in-progress'] }
        }).select('startTime endTime serviceDuration');
        
        // Generate available time slots (9 AM to 7 PM, 30-minute intervals)
        const allSlots = [];
        for (let hour = 9; hour < 19; hour++) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        // Filter out booked slots
        const bookedSlots = new Set();
        bookings.forEach(booking => {
            const startHour = parseInt(booking.startTime.split(':')[0]);
            const startMin = parseInt(booking.startTime.split(':')[1]);
            const duration = booking.serviceDuration || 60;
            
            // Mark slots as booked based on duration
            let currentTime = startHour * 60 + startMin;
            const endTime = currentTime + duration;
            
            while (currentTime < endTime) {
                const hour = Math.floor(currentTime / 60);
                const min = currentTime % 60;
                const slot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                bookedSlots.add(slot);
                currentTime += 30; // 30-minute intervals
            }
        });
        
        const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));
        
        res.json({
            success: true,
            data: availableSlots,
            bookedSlots: Array.from(bookedSlots)
        });
    } catch (error) {
        logger.error('Error checking availability:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check availability'
        });
    }
});

export default router;