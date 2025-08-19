import express from 'express';
import jwt from 'jsonwebtoken';
import Booking from '../models/Booking.js';

const router = express.Router();

// Auth middleware (JWT from marketing login or PWA)
const auth = (req, res, next) => {
	try {
		const token = req.headers.authorization?.replace('Bearer ', '');
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
			req.userId = decoded.userId;
			return next();
		}
		// Fallback: allow x-user-id header for server-to-server/public booking integrations
		const headerUser = req.headers['x-user-id'];
		if (headerUser) {
			req.userId = headerUser;
			return next();
		}
		return res.status(401).json({ error: 'Authentication required' });
	} catch (e) {
		const headerUser = req.headers['x-user-id'];
		if (headerUser) {
			req.userId = headerUser;
			return next();
		}
		return res.status(401).json({ error: 'Invalid token' });
	}
};

// Create or upsert a booking from booking website
router.post('/bookings', auth, async (req, res) => {
	try {
		const payload = req.body || {};
		const criteria = {
			userId: req.userId,
			source: payload.source || 'booking-site',
			externalId: payload.externalId || null
		};

		let booking = await Booking.findOne(criteria);
		if (!booking) booking = new Booking({ userId: req.userId });

		booking.source = payload.source || 'booking-site';
		booking.externalId = payload.externalId || booking.externalId;
		booking.storeId = payload.storeId || booking.storeId;
		booking.storeName = payload.storeName || booking.storeName;
		booking.customer = payload.customer || booking.customer;
		booking.serviceId = payload.serviceId || booking.serviceId;
		booking.serviceName = payload.serviceName || booking.serviceName;
		booking.durationMins = payload.durationMins || booking.durationMins || 60;
		booking.partySize = payload.partySize || booking.partySize || 1;
		booking.roomPreference = payload.roomPreference || booking.roomPreference;
		booking.employeeId = payload.employeeId || booking.employeeId;
		booking.employeeName = payload.employeeName || booking.employeeName;
		booking.startTime = payload.startTime ? new Date(payload.startTime) : booking.startTime;
		booking.endTime = payload.endTime ? new Date(payload.endTime) : booking.endTime;
		booking.status = payload.status || booking.status || 'pending';
		booking.notes = payload.notes || booking.notes;
		booking.syncStatus = 'synced';
		booking.lastSyncDate = new Date();

		await booking.save();
		return res.status(booking.isNew ? 201 : 200).json({ success: true, data: booking });
	} catch (error) {
		console.error('Create booking error:', error);
		return res.status(500).json({ error: 'Failed to create booking' });
	}
});

// List bookings (since, status filter)
router.get('/bookings', auth, async (req, res) => {
	try {
		const { since, status } = req.query;
		const q = { userId: req.userId };
		if (since) q.updatedAt = { $gte: new Date(since) };
		if (status) q.status = status;
		const bookings = await Booking.find(q).sort({ startTime: 1 }).limit(500);
		return res.json({ success: true, data: bookings });
	} catch (error) {
		console.error('Get bookings error:', error);
		return res.status(500).json({ error: 'Failed to fetch bookings' });
	}
});

// Update booking status/assignment
router.put('/bookings/:id/status', auth, async (req, res) => {
	try {
		const { status, employeeId, employeeName, roomNumber } = req.body;
		const booking = await Booking.findOne({ _id: req.params.id, userId: req.userId });
		if (!booking) return res.status(404).json({ error: 'Booking not found' });
		if (status) booking.status = status;
		if (employeeId) booking.employeeId = employeeId;
		if (employeeName) booking.employeeName = employeeName;
		if (roomNumber) booking.roomNumber = roomNumber;
		booking.lastSyncDate = new Date();
		await booking.save();
		return res.json({ success: true, data: booking });
	} catch (error) {
		console.error('Update booking status error:', error);
		return res.status(500).json({ error: 'Failed to update booking' });
	}
});

// Simple availability endpoint
router.get('/availability', auth, async (req, res) => {
	try {
		const { date, serviceId } = req.query;
		// Minimal placeholder: return hourly slots 09:00-21:00
		const base = new Date(date || new Date());
		base.setHours(9,0,0,0);
		const slots = [];
		for (let i=0;i<12;i++) {
			const start = new Date(base.getTime() + i*60*60*1000);
			slots.push({ startTime: start.toISOString(), available: true });
		}
		return res.json({ success: true, data: { slots, serviceId } });
	} catch (error) {
		console.error('Availability error:', error);
		return res.status(500).json({ error: 'Failed to get availability' });
	}
});

export default router;


