import { Router } from 'express';
import ActiveService from '../../models/ActiveService.js';

const router = Router();

// Get all active/pending room services for a business
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;

        // Get all active and pending services for this business
        const services = await ActiveService.find({
            userId: userId,
            status: { $in: ['active', 'pending'] }
        }).sort({ createdAt: -1 });

        console.log(`📋 [ROOM-SERVICES] Found ${services.length} active/pending services for user ${userId}`);

        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        console.error('❌ [ROOM-SERVICES] Error fetching services:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create a new pending service
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const serviceData = req.body;

        const newService = new ActiveService({
            ...serviceData,
            userId: userId
        });

        await newService.save();

        console.log(`✅ [ROOM-SERVICES] Created pending service:`, {
            serviceId: newService._id,
            roomName: serviceData.roomName,
            status: serviceData.status
        });

        res.json({
            success: true,
            data: newService
        });
    } catch (error) {
        console.error('❌ [ROOM-SERVICES] Error creating service:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update service status (pending -> active, or end service)
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const serviceId = req.params.id;
        const updateData = req.body;

        const service = await ActiveService.findOneAndUpdate(
            {
                _id: serviceId,
                userId: userId
            },
            {
                $set: updateData
            },
            {
                new: true
            }
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        console.log(`✅ [ROOM-SERVICES] Updated service ${serviceId}:`, updateData);

        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('❌ [ROOM-SERVICES] Error updating service:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete/cancel a service
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const serviceId = req.params.id;

        const service = await ActiveService.findOneAndDelete({
            _id: serviceId,
            userId: userId
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        console.log(`✅ [ROOM-SERVICES] Deleted service ${serviceId}`);

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('❌ [ROOM-SERVICES] Error deleting service:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
