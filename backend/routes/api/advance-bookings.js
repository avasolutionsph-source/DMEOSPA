import { Router } from 'express';
import AdvanceBooking from '../../models/AdvanceBooking.js';

const router = Router();

// Get all advance bookings for a business
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { status, startDate, endDate } = req.query;

        // Build query
        const query = { userId: userId };

        // Filter by status if provided
        if (status) {
            query.status = status;
        } else {
            // Default: exclude cancelled, completed, and in-progress bookings
            // (in-progress bookings are already converted to active services)
            query.status = { $in: ['scheduled', 'confirmed'] };
        }

        // Filter by date range if provided
        if (startDate || endDate) {
            query.bookingDateTime = {};
            if (startDate) {
                query.bookingDateTime.$gte = new Date(startDate);
            }
            if (endDate) {
                query.bookingDateTime.$lte = new Date(endDate);
            }
        } else {
            // Default: Only return future bookings (performance optimization)
            query.bookingDateTime = { $gte: new Date() };
        }

        const bookings = await AdvanceBooking.find(query).sort({ bookingDateTime: 1 }).lean();

        console.log(`📋 [ADVANCE-BOOKINGS] Found ${bookings.length} bookings for user ${userId}`);

        res.json({
            success: true,
            data: bookings
        });
    } catch (error) {
        console.error('❌ [ADVANCE-BOOKINGS] Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get a single advance booking by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const bookingId = req.params.id;

        const booking = await AdvanceBooking.findOne({
            _id: bookingId,
            userId: userId
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        console.error('❌ [ADVANCE-BOOKINGS] Error fetching booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create a new advance booking
router.post('/', async (req, res) => {
    try {
        console.log('📥 [ADVANCE-BOOKINGS] POST request received:', {
            hasBody: !!req.body,
            bodyKeys: Object.keys(req.body || {}),
            hasUser: !!req.user
        });

        const userId = req.user.userId || req.user.id;
        const bookingData = req.body;

        // Validate booking datetime is in the future
        const bookingDate = new Date(bookingData.bookingDateTime);
        if (bookingDate <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Booking date must be in the future'
            });
        }

        console.log('🔑 [ADVANCE-BOOKINGS] Creating booking with userId:', userId);

        const newBooking = new AdvanceBooking({
            ...bookingData,
            userId: userId,
            status: bookingData.status || 'scheduled'
        });

        await newBooking.save();

        console.log(`✅ [ADVANCE-BOOKINGS] Created booking:`, {
            bookingId: newBooking._id,
            userId: newBooking.userId,
            bookingDateTime: newBooking.bookingDateTime,
            serviceName: newBooking.serviceName,
            employeeName: newBooking.employeeName
        });

        res.json({
            success: true,
            data: newBooking
        });
    } catch (error) {
        console.error('❌ [ADVANCE-BOOKINGS] Error creating booking:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update an advance booking
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const bookingId = req.params.id;
        const updateData = req.body;

        // If updating booking datetime, validate it's in the future
        if (updateData.bookingDateTime) {
            const bookingDate = new Date(updateData.bookingDateTime);
            if (bookingDate <= new Date() && updateData.status !== 'in-progress' && updateData.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    error: 'Booking date must be in the future'
                });
            }
        }

        const booking = await AdvanceBooking.findOneAndUpdate(
            {
                _id: bookingId,
                userId: userId
            },
            {
                $set: updateData
            },
            {
                new: true
            }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        console.log(`✅ [ADVANCE-BOOKINGS] Updated booking ${bookingId}`);

        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        console.error('❌ [ADVANCE-BOOKINGS] Error updating booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cancel an advance booking
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const bookingId = req.params.id;
        const { reason } = req.body;

        const booking = await AdvanceBooking.findOneAndUpdate(
            {
                _id: bookingId,
                userId: userId
            },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancellationReason: reason || 'No reason provided'
                }
            },
            {
                new: true
            }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        console.log(`✅ [ADVANCE-BOOKINGS] Cancelled booking ${bookingId}`);

        res.json({
            success: true,
            data: booking,
            message: 'Booking cancelled successfully'
        });
    } catch (error) {
        console.error('❌ [ADVANCE-BOOKINGS] Error cancelling booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Convert advance booking to active service
router.post('/:id/convert', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const bookingId = req.params.id;
        const { activeServiceId } = req.body;

        const booking = await AdvanceBooking.findOneAndUpdate(
            {
                _id: bookingId,
                userId: userId,
                status: { $in: ['scheduled', 'confirmed'] }
            },
            {
                $set: {
                    status: 'in-progress',
                    activeServiceId: activeServiceId,
                    convertedToActiveAt: new Date()
                }
            },
            {
                new: true
            }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found or already converted'
            });
        }

        console.log(`✅ [ADVANCE-BOOKINGS] Converted booking ${bookingId} to active service`);

        res.json({
            success: true,
            data: booking,
            message: 'Booking converted to active service'
        });
    } catch (error) {
        console.error('❌ [ADVANCE-BOOKINGS] Error converting booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
