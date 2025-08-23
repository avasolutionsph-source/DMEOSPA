# Ava Solutions Unified Backend

## Overview
This unified backend consolidates three previously separate backend systems into one cohesive, maintainable architecture:
- **backend/** (redirect wrapper)
- **marketing-website/** (marketing & admin)
- **pwa-backend/** (PWA API)

## Architecture

### Key Features
- ✅ Single unified server handling all endpoints
- ✅ Consolidated middleware (auth, logging, error handling)
- ✅ Unified database connection with connection pooling
- ✅ Real-time updates via Socket.IO
- ✅ Comprehensive logging and monitoring
- ✅ Professional error handling
- ✅ Rate limiting and security
- ✅ StateManager integration for real-time sync

### Directory Structure
```
unified-backend/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection & helpers
│   ├── passport.js   # Authentication strategies
│   └── redis.js      # Redis cache configuration
├── middleware/       # Express middleware
│   ├── auth.js       # Authentication & authorization
│   ├── errorHandler.js # Error handling
│   ├── requestLogger.js # Request/response logging
│   └── validation.js # Input validation
├── models/          # Mongoose models
│   ├── User.js
│   ├── Business.js
│   ├── Product.js
│   ├── Transaction.js
│   └── index.js
├── routes/          # API routes
│   ├── api/         # PWA API endpoints
│   ├── admin/       # Admin panel endpoints
│   ├── marketing/   # Marketing website endpoints
│   ├── sync/        # Data synchronization
│   └── realtime/    # WebSocket endpoints
├── services/        # Business logic
│   ├── authService.js
│   ├── syncService.js
│   ├── emailService.js
│   └── analyticsService.js
├── utils/           # Utility functions
│   ├── logger.js    # Winston logger
│   ├── validators.js
│   └── helpers.js
├── test/            # Test files
├── scripts/         # Utility scripts
├── server.js        # Main server file
├── package.json
└── .env.example
```

## Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis (optional, for caching)
- npm >= 9.0.0

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   cd unified-backend
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start MongoDB:
   ```bash
   mongod
   ```

5. Run the server:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/version` - API version info
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Password reset

### Protected Endpoints (Auth Required)
- `GET /api/user/profile` - Get user profile
- `GET /api/business` - Get business info
- `GET /api/products` - Get products
- `GET /api/inventory` - Get inventory
- `GET /api/employees` - Get employees
- `GET /api/transactions` - Get transactions
- `POST /api/sync/push` - Push sync data
- `GET /api/sync/pull` - Pull sync data

### Admin Endpoints
- `GET /admin/users` - List all users
- `GET /admin/businesses` - List all businesses
- `GET /admin/analytics` - System analytics
- `POST /admin/broadcast` - Send notifications

### Real-time WebSocket Events
- `connection` - Client connected
- `authenticate` - Authenticate socket
- `state:sync` - Sync state changes
- `business:update` - Business data updated
- `inventory:changed` - Inventory changed
- `transaction:new` - New transaction

## Configuration

### Environment Variables
See `.env.example` for all available configuration options.

Key configurations:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 4000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## Authentication

### JWT Authentication
```javascript
// Request header
Authorization: Bearer <token>
```

### API Key Authentication
```javascript
// Request header
X-API-Key: <api-key>
```

### Session Authentication
Used for marketing website with Passport.js strategies:
- Local (email/password)
- Google OAuth
- (Extensible for other providers)

## Database

### Models
- **User** - User accounts and authentication
- **Business** - Business profiles and settings
- **Product** - Product catalog
- **Inventory** - Inventory tracking
- **Employee** - Employee management
- **Transaction** - Sales transactions
- **Subscription** - Subscription plans
- **SyncLog** - Sync history tracking

### Migrations
```bash
npm run migrate
```

### Seeding
```bash
npm run seed
```

## Logging

The unified logger provides:
- Console output (colored in development)
- Daily rotating file logs
- Separate error logs
- HTTP request logs
- Performance metrics
- Audit trails

### Log Levels
- `error` - Error messages
- `warn` - Warning messages
- `info` - Information messages
- `http` - HTTP requests
- `debug` - Debug information
- `silly` - Verbose debugging

## Error Handling

Centralized error handling with:
- Custom error classes
- Mongoose error formatting
- JWT error handling
- Validation error formatting
- Production-safe error responses

## Security

### Implemented Security Measures
- Helmet.js for security headers
- CORS with whitelist
- Rate limiting per endpoint
- Input validation
- SQL injection prevention
- XSS protection
- Password hashing (bcrypt)
- JWT token expiration
- Session management

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

### Docker
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

### PM2
```bash
# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart
```

### Environment-specific Configs
- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

## Monitoring

### Health Checks
- `/health` - Basic health check
- `/api/health` - API health check
- `/admin/health` - Detailed health metrics

### Metrics
- Request/response times
- Error rates
- Database performance
- Cache hit rates
- WebSocket connections

## Migration Guide

### From Old Backends

1. **Update frontend API URLs:**
   ```javascript
   // Old
   const API_URL = 'http://localhost:3001/api';  // marketing
   const PWA_API = 'http://localhost:4000/api';  // pwa

   // New (unified)
   const API_URL = 'http://localhost:4000/api';
   ```

2. **Update authentication:**
   - JWT tokens remain compatible
   - Session cookies may need refresh

3. **Database migration:**
   ```bash
   npm run migrate:from-old
   ```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -i :4000
   kill -9 <PID>
   ```

2. **MongoDB connection failed**
   - Check MongoDB is running
   - Verify connection string in .env

3. **CORS errors**
   - Add origin to ALLOWED_ORIGINS in .env

4. **WebSocket connection failed**
   - Ensure ENABLE_WEBSOCKETS=true
   - Check firewall rules

## Support

For issues or questions:
- Create an issue in the repository
- Contact: support@avasolutions.com
- Documentation: /api/docs

## License

MIT License - See LICENSE file for details