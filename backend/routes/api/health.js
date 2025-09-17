// Health Check Routes for Unified Backend
// Provides detailed health status including Socket.IO

import express from 'express';
import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

const router = express.Router();

// Local Socket.IO stats function (moved from config/socket.js)
function getSocketIOStats(io) {
    if (!io) return null;
    
    const sockets = io.sockets.sockets;
    const rooms = io.sockets.adapter.rooms;
    
    let authenticatedCount = 0;
    let unauthenticatedCount = 0;
    const userRooms = new Set();
    
    sockets.forEach((socket) => {
        if (socket.authenticated) {
            authenticatedCount++;
            if (socket.userId) {
                userRooms.add(`user:${socket.userId}`);
            }
        } else {
            unauthenticatedCount++;
        }
    });
    
    return {
        totalConnections: sockets.size,
        authenticatedConnections: authenticatedCount,
        unauthenticatedConnections: unauthenticatedCount,
        uniqueUsers: userRooms.size,
        totalRooms: rooms.size
    };
}

// Main health check endpoint
router.get('/', (req, res) => {
    const io = req.app.get('io');
    const socketStats = getSocketIOStats(io);
    
    res.json({
        status: 'healthy',
        service: 'Ava Solutions Unified Backend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        socketIO: socketStats || { status: 'not initialized' }
    });
});

// Socket.IO specific health check
router.get('/socket.io', (req, res) => {
    const io = req.app.get('io');
    
    if (!io) {
        return res.status(503).json({
            status: 'unavailable',
            message: 'Socket.IO server not initialized'
        });
    }
    
    const stats = getSocketIOStats(io);
    
    res.json({
        status: 'healthy',
        endpoint: '/socket.io/',
        transport: ['websocket', 'polling'],
        stats: stats,
        config: {
            path: '/socket.io/',
            cors: {
                enabled: true,
                credentials: true
            },
            pingInterval: 25000,
            pingTimeout: 60000
        }
    });
});

// Test Socket.IO connection endpoint
router.get('/socket.io/test', (req, res) => {
    const protocol = req.secure ? 'wss' : 'ws';
    const host = req.get('host');
    
    res.json({
        status: 'ready',
        message: 'Socket.IO endpoint is ready for connections',
        connectionUrl: `${protocol}://${host}`,
        path: '/socket.io/',
        testClient: {
            javascript: `
// Test connection from browser console
const socket = io('${protocol}://${host}', {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    auth: {
        token: 'your-jwt-token-here'
    }
});

socket.on('connect', () => {
    console.log('Connected:', socket.id);
});

socket.on('authenticated', (data) => {
    console.log('Authenticated:', data);
});
            `.trim()
        }
    });
});

// Database health check
router.get('/database', async (req, res) => {
    try {
        // Check database connection
        const dbState = mongoose.connection.readyState;
        
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        res.json({
            status: dbState === 1 ? 'healthy' : 'unhealthy',
            state: states[dbState],
            database: process.env.MONGODB_URI ? 'MongoDB' : 'Not configured'
        });
    } catch (error) {
        logger.error('Database health check failed:', error);
        res.status(503).json({
            status: 'error',
            message: 'Database health check failed'
        });
    }
});

// API endpoints health check
router.get('/endpoints', (req, res) => {
    const endpoints = {
        health: {
            main: '/api/health',
            socketIO: '/api/health/socket.io',
            database: '/api/health/database'
        },
        api: {
            auth: '/api/auth',
            sync: '/api/sync',
            user: '/api/user',
            realtime: '/api/realtime'
        },
        websocket: {
            endpoint: '/socket.io/',
            status: 'active'
        }
    };
    
    res.json({
        status: 'healthy',
        endpoints: endpoints,
        documentation: '/api/docs'
    });
});

export default router;
