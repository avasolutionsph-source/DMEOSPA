import { Router } from 'express';
import { ObjectId } from 'mongodb';

const router = Router();

// Get all active/pending room services for a business
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userId = req.user.userId || req.user.id;

        // Get all active and pending services for this business
        const services = await db.collection('activeServices')
            .find({
                userId: userId,
                status: { $in: ['active', 'pending'] }
            })
            .toArray();

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
        const db = req.app.locals.db;
        const userId = req.user.userId || req.user.id;
        const serviceData = req.body;

        const newService = {
            ...serviceData,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('activeServices').insertOne(newService);

        console.log(`✅ [ROOM-SERVICES] Created pending service:`, {
            serviceId: result.insertedId,
            roomName: serviceData.roomName,
            status: serviceData.status
        });

        res.json({
            success: true,
            data: {
                ...newService,
                _id: result.insertedId
            }
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
        const db = req.app.locals.db;
        const userId = req.user.userId || req.user.id;
        const serviceId = req.params.id;
        const updateData = req.body;

        const result = await db.collection('activeServices').findOneAndUpdate(
            {
                _id: new ObjectId(serviceId),
                userId: userId
            },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date()
                }
            },
            {
                returnDocument: 'after'
            }
        );

        if (!result.value) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }

        console.log(`✅ [ROOM-SERVICES] Updated service ${serviceId}:`, updateData);

        res.json({
            success: true,
            data: result.value
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
        const db = req.app.locals.db;
        const userId = req.user.userId || req.user.id;
        const serviceId = req.params.id;

        const result = await db.collection('activeServices').deleteOne({
            _id: new ObjectId(serviceId),
            userId: userId
        });

        if (result.deletedCount === 0) {
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
