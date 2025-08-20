# API Reference

## PWA Backend API (Port 4000)

### Authentication Endpoints
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - JWT token verification
- `POST /api/auth/refresh` - Refresh JWT token

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/businesses` - Get user's businesses
- `POST /api/users/businesses` - Create new business

### Data Synchronization
- `POST /api/sync/upload` - Upload local data to server
- `GET /api/sync/download` - Download server data
- `GET /api/sync/status` - Check sync status
- `POST /api/sync/resolve-conflicts` - Resolve data conflicts

### Public Catalog (No Auth Required)
- `GET /api/catalog/businesses` - List all spa businesses
- `GET /api/catalog/businesses/:id` - Get business details
- `GET /api/catalog/services/:businessId` - Get business services
- `GET /api/catalog/availability/:businessId` - Check appointment availability

### Business Data (Auth Required)
- `GET /api/businesses/:id/services` - Get business services
- `POST /api/businesses/:id/services` - Create new service
- `PUT /api/businesses/:id/services/:serviceId` - Update service
- `DELETE /api/businesses/:id/services/:serviceId` - Delete service

## Marketing Website API (Port 3000)

### Public Endpoints
- `GET /` - Landing page
- `POST /register` - Business registration
- `GET /login` - Login page
- `POST /login` - User authentication

### Admin Panel (Auth Required)
- `GET /admin` - Admin dashboard
- `GET /admin/users` - List all users
- `PUT /admin/users/:id` - Update user status
- `DELETE /admin/users/:id` - Delete user account

### Business Management
- `GET /api/businesses` - List user businesses
- `POST /api/businesses` - Create new business
- `PUT /api/businesses/:id` - Update business details
- `GET /api/subscriptions` - Get subscription status

## Booking Website Integration

### Client-Side API Calls
- Fetches spa catalog from PWA backend
- Books appointments via PWA backend
- Handles customer information collection

### Key JavaScript Functions
- `loadSpaCatalog()` - Loads available spas
- `loadServices(spaId)` - Loads spa services
- `bookAppointment(data)` - Creates appointment booking
- `checkAvailability(spaId, date)` - Checks time slots

## Common Request/Response Patterns

### Authentication Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Standard Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Standard Success Responses
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

## Environment Variables
- `PORT` - Server port (default: 4000 for PWA backend, 3000 for marketing)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origins

## Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Public catalog: 50 requests per 15 minutes

## Security Features
- JWT token expiration (24 hours default)
- Password hashing with bcrypt (10 salt rounds)
- Input validation with express-validator
- CORS protection
- Helmet security headers
- Request sanitization