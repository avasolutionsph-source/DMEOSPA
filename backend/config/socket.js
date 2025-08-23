// Socket.IO Configuration for Unified Backend
// Handles real-time connections for StateManager synchronization

import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger.js';

// JWT verification helper
export async function verifySocketToken(token) {
    try {
        if (!token) return null;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
        return decoded.userId || decoded.id;
    } catch (error) {
        logger.error('Socket token verification failed:', error);
        return null;
    }
}

// Initialize Socket.IO with proper configuration
export function initializeSocketIO(server) {
    const io = new SocketIOServer(server, {
        cors: {
            origin: function(origin, callback) {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://localhost:8080',
                    'http://127.0.0.1:5500',
                    'http://localhost:5500',
                    'file://'  // Allow local file access for development
                ];
                
                // Add environment-specific origins
                if (process.env.ALLOWED_ORIGINS) {
                    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
                }
                
                // Allow Netlify and Render domains
                if (!origin || 
                    allowedOrigins.includes(origin) || 
                    /netlify\.app$/.test(origin) || 
                    /onrender\.com$/.test(origin)) {
                    callback(null, true);
                } else {
                    logger.warn(`Socket.IO CORS rejected origin: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST']
        },
        // Socket.IO options
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 30000,
        maxHttpBufferSize: 1e8, // 100 MB
        allowEIO3: true // Allow different Socket.IO versions
    });

    // Middleware for Socket.IO authentication
    io.use(async (socket, next) => {
        try {
            // Try to get token from various sources
            const token = socket.handshake.auth?.token || 
                         socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                         socket.handshake.query?.token;
            
            if (token) {
                const userId = await verifySocketToken(token);
                if (userId) {
                    socket.userId = userId;
                    socket.authenticated = true;
                    logger.info(`Socket authenticated for user ${userId}`);
                    return next();
                }
            }
            
            // Allow connection but mark as unauthenticated
            socket.authenticated = false;
            logger.info('Socket connected without authentication');
            next();
        } catch (error) {
            logger.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id} (authenticated: ${socket.authenticated})`);
        
        // Send connection success
        socket.emit('connected', {
            socketId: socket.id,
            authenticated: socket.authenticated,
            userId: socket.userId || null
        });
        
        // Handle authentication after connection
        socket.on('authenticate', async (data) => {
            try {
                const token = data?.token || data;
                const userId = await verifySocketToken(token);
                
                if (userId) {
                    // Leave any previous user rooms
                    const rooms = Array.from(socket.rooms);
                    rooms.forEach(room => {
                        if (room.startsWith('user:')) {
                            socket.leave(room);
                        }
                    });
                    
                    // Join new user room
                    socket.userId = userId;
                    socket.authenticated = true;
                    socket.join(`user:${userId}`);
                    
                    socket.emit('authenticated', {
                        success: true,
                        userId: userId,
                        message: 'Authentication successful'
                    });
                    
                    logger.info(`Socket ${socket.id} authenticated as user ${userId}`);
                } else {
                    socket.emit('authenticated', {
                        success: false,
                        message: 'Invalid token'
                    });
                }
            } catch (error) {
                logger.error('Socket authentication error:', error);
                socket.emit('authenticated', {
                    success: false,
                    message: 'Authentication failed'
                });
            }
        });
        
        // Handle state synchronization
        socket.on('state:sync', async (data) => {
            if (!socket.authenticated) {
                return socket.emit('error', {
                    type: 'AUTH_REQUIRED',
                    message: 'Authentication required for state sync'
                });
            }
            
            try {
                // Emit to all user's devices except sender
                socket.to(`user:${socket.userId}`).emit('state:update', {
                    ...data,
                    fromDevice: socket.id,
                    timestamp: Date.now()
                });
                
                // Acknowledge sync
                socket.emit('state:sync:ack', {
                    success: true,
                    timestamp: Date.now()
                });
                
                logger.debug(`State sync from ${socket.userId}:`, data.module || 'unknown');
            } catch (error) {
                logger.error('State sync error:', error);
                socket.emit('error', {
                    type: 'SYNC_ERROR',
                    message: 'State synchronization failed'
                });
            }
        });
        
        // Handle full state request
        socket.on('state:request:full', async (data) => {
            if (!socket.authenticated) {
                return socket.emit('error', {
                    type: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                });
            }
            
            // This would typically fetch from database
            // For now, request from other connected devices
            socket.to(`user:${socket.userId}`).emit('state:request:full', {
                requesterId: socket.id
            });
        });
        
        // Handle business updates
        socket.on('business:update', async (data) => {
            if (!socket.authenticated) {
                return socket.emit('error', {
                    type: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                });
            }
            
            // Broadcast to all user's devices
            io.to(`user:${socket.userId}`).emit('business:changed', {
                ...data,
                timestamp: Date.now()
            });
        });
        
        // Handle inventory updates
        socket.on('inventory:update', async (data) => {
            if (!socket.authenticated) {
                return socket.emit('error', {
                    type: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                });
            }
            
            // Broadcast to all user's devices
            io.to(`user:${socket.userId}`).emit('inventory:updated', {
                ...data,
                timestamp: Date.now()
            });
        });
        
        // Handle transaction updates
        socket.on('transaction:new', async (data) => {
            if (!socket.authenticated) {
                return socket.emit('error', {
                    type: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                });
            }
            
            // Broadcast to all user's devices
            io.to(`user:${socket.userId}`).emit('transactions:new', {
                ...data,
                timestamp: Date.now()
            });
        });
        
        // Handle sync conflicts
        socket.on('sync:conflict:resolve', async (data) => {
            if (!socket.authenticated) {
                return socket.emit('error', {
                    type: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                });
            }
            
            // Broadcast resolution to all devices
            io.to(`user:${socket.userId}`).emit('sync:conflict:resolved', {
                ...data,
                resolvedBy: socket.id,
                timestamp: Date.now()
            });
        });
        
        // Heartbeat/ping handling
        socket.on('ping', () => {
            socket.emit('pong', {
                timestamp: Date.now(),
                authenticated: socket.authenticated
            });
        });
        
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.id} (reason: ${reason})`);
            
            if (socket.userId) {
                // Notify other devices about disconnection
                socket.to(`user:${socket.userId}`).emit('device:disconnected', {
                    deviceId: socket.id,
                    timestamp: Date.now()
                });
            }
        });
        
        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.id}:`, error);
        });
    });

    // Periodic cleanup of inactive sockets
    setInterval(() => {
        const sockets = io.sockets.sockets;
        let activeCount = 0;
        let inactiveCount = 0;
        
        sockets.forEach((socket) => {
            if (socket.connected) {
                activeCount++;
            } else {
                inactiveCount++;
                socket.disconnect(true);
            }
        });
        
        if (inactiveCount > 0) {
            logger.info(`Socket cleanup: ${activeCount} active, ${inactiveCount} disconnected`);
        }
    }, 60000); // Every minute

    return io;
}

// Export health check for Socket.IO
export function getSocketIOStats(io) {
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

export default initializeSocketIO;