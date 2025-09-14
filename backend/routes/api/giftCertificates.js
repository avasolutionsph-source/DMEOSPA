import express from 'express';
import GiftCertificate from '../../models/GiftCertificate.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Additional gift certificate specific routes (MUST come before base routes)
router.get('/search/:controlNumber', withErrorHandling(async (req, res) => {
    const { controlNumber } = req.params;
    
    const giftCertificate = await GiftCertificate.findOne({
        userId: req.user._id,
        controlNumber: controlNumber.toString()
    });
    
    if (!giftCertificate) {
        return res.status(404).json({
            success: false,
            error: { message: 'Gift certificate not found' }
        });
    }
    
    logger.info(`Found gift certificate: ${controlNumber}`, {
        category: 'DATABASE',
        operation: 'search_gift_certificate',
        data: { controlNumber, status: giftCertificate.status }
    });
    
    res.json({
        success: true,
        data: giftCertificate
    });
}));

router.post('/:id/use', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { transactionId, usedBy = 'system' } = req.body;
    
    const giftCertificate = await GiftCertificate.findOne({
        _id: id,
        userId: req.user._id
    });
    
    if (!giftCertificate) {
        return res.status(404).json({
            success: false,
            error: { message: 'Gift certificate not found' }
        });
    }
    
    // Validate before use
    const validation = giftCertificate.validateForUse();
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            error: { message: validation.reason }
        });
    }
    
    // Use the gift certificate
    const updatedGC = await giftCertificate.use(transactionId, usedBy);
    
    logger.info(`Gift certificate used: ${id}`, {
        category: 'DATABASE',
        operation: 'use_gift_certificate',
        data: { id, transactionId, usedBy }
    });
    
    res.json({
        success: true,
        data: updatedGC,
        message: 'Gift certificate used successfully'
    });
}));

router.patch('/:id/status', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { status, reason = 'Status update' } = req.body;
    
    if (!['active', 'used', 'expired', 'voided'].includes(status)) {
        return res.status(400).json({
            success: false,
            error: { message: 'Invalid status. Must be: active, used, expired, or voided' }
        });
    }
    
    const giftCertificate = await GiftCertificate.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { 
            status,
            syncStatus: 'pending',
            ...(status === 'voided' ? { voidedDate: new Date(), voidedBy: req.user._id } : {}),
            ...(status === 'used' ? { usedDate: new Date() } : {}),
            $push: {
                auditLog: {
                    action: `status-change-${status}`,
                    date: new Date(),
                    by: req.user._id,
                    details: reason
                }
            }
        },
        { new: true }
    );
    
    if (!giftCertificate) {
        return res.status(404).json({
            success: false,
            error: { message: 'Gift certificate not found' }
        });
    }
    
    logger.info(`Updated gift certificate status: ${id}`, {
        category: 'DATABASE',
        operation: 'update_gift_certificate_status',
        data: { id, status, reason }
    });
    
    res.json({
        success: true,
        data: giftCertificate,
        message: 'Gift certificate status updated successfully'
    });
}));

// Create base route handler for gift certificates (MUST come after specific routes)
const giftCertificateHandler = new BaseRouteHandler(GiftCertificate, {
    populate: [], // Add population fields if needed
    searchFields: ['controlNumber', 'recipient'],
    sortField: 'createdAt',
    sortOrder: -1, // Most recent first
    requiredFields: ['controlNumber', 'amount', 'createdBy'],
    uniqueFields: ['controlNumber'], // Control number should be unique globally
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
giftCertificateHandler.createRoutes(router);

export default router;