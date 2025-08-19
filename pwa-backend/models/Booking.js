import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
	// Tenant context
	userId: {
		type: String,
		required: true,
		index: true
	},

	// Linking to external systems
	source: {
		type: String,
		enum: ['booking-site', 'pos', 'api', 'other'],
		default: 'booking-site',
		index: true
	},
	externalId: {
		type: String,
		index: true,
		sparse: true
	},

	// Store/branch selection
	storeId: {
		type: String,
		default: 'default'
	},
	storeName: {
		type: String,
		default: 'Main Branch'
	},

	// Customer info
	customer: {
		name: String,
		phone: String,
		email: String
	},

	// Service and assignment
	serviceId: String,
	serviceName: String,
	durationMins: { type: Number, default: 60 },
	partySize: { type: Number, default: 1 },
	roomPreference: String,
	roomNumber: String,
	employeeId: String,
	employeeName: String,

	// Scheduling
	startTime: { type: Date, required: true },
	endTime: { type: Date },

	// Lifecycle
	status: {
		type: String,
		enum: ['pending', 'confirmed', 'cancelled', 'completed'],
		default: 'pending',
		index: true
	},
	notes: String,

	// Sync metadata
	syncStatus: {
		type: String,
		enum: ['pending', 'synced', 'error'],
		default: 'synced'
	},
	lastSyncDate: { type: Date, default: Date.now }
}, {
	timestamps: true
});

bookingSchema.index({ userId: 1, startTime: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ userId: 1, source: 1, externalId: 1 }, { unique: false });

export default mongoose.model('Booking', bookingSchema);


