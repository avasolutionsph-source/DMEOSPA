# Component Reference

## Main PWA Components

### Core System Files
- `index.html` - Main PWA entry point with navigation and module loading
- `service-worker.js` - PWA offline functionality and caching
- `manifest.json` - PWA configuration and icons

### JavaScript Modules
- `js/database.js` - IndexedDB wrapper for offline storage
- `js/pos.js` - Point of sale system with cart management
- `js/sync.js` - Online/offline synchronization manager
- `js/unified-auth.js` - Cross-component authentication
- `js/dashboard.js` - Business analytics and reporting
- `js/inventory.js` - Stock management and SKU tracking
- `js/services.js` - Spa services and treatment management
- `js/employees.js` - Staff management and payroll
- `js/bookings.js` - Appointment scheduling system
- `js/rooms.js` - Room assignment and status tracking
- `js/chatbot.js` - AI assistant functionality
- `js/profile.js` - User profile management
- `js/performance.js` - Performance monitoring and optimization

### UI Components
- `css/styles.css` - Main application styling
- `css/pos.css` - POS-specific styling
- Individual component CSS files for specific modules

## Booking Website Components

### Main Files
- `booking-website/index.html` - Public booking portal entry
- `booking-website/spa.js` - Spa catalog and booking functionality
- `booking-website/style.css` - Booking portal styling

### Features
- Business directory with spa listings
- Service catalog browsing
- Appointment booking interface
- Integration with PWA backend APIs

## Marketing Website Components

### Backend Structure
- `marketing-website/server.js` - Express server with MongoDB
- `marketing-website/routes/` - API endpoint definitions
- `marketing-website/models/` - MongoDB schemas
- `marketing-website/middleware/` - Authentication and validation

### Frontend Pages
- Landing page with business registration
- Admin panel for user management
- Subscription and billing interfaces
- Business onboarding flows

## PWA Backend Components

### API Server
- `pwa-backend/server.js` - Main Express server
- Authentication endpoints (`/api/auth/*`)
- User management (`/api/users/*`)
- Business data sync (`/api/sync/*`)
- Public catalog APIs (`/api/catalog/*`)

### Key Features
- JWT token validation
- MongoDB data persistence
- CORS handling for cross-origin requests
- Rate limiting and security middleware

## Data Models

### IndexedDB Stores (PWA)
- `products` - Service catalog items
- `inventory` - Stock tracking data
- `employees` - Staff information
- `transactions` - POS transaction history
- `bookings` - Appointment data
- `rooms` - Room status and assignments
- `sync_status` - Synchronization tracking

### MongoDB Collections
- `users` - User accounts and authentication
- `businesses` - Business profiles and settings
- `services` - Service catalog
- `appointments` - Booking data
- `employees` - Staff records
- `transactions` - Sales history