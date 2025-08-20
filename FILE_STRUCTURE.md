# File Structure Reference

## Root Directory Structure
```
AvasolutionsWebAPp/
├── PROJECT_OVERVIEW.md          # Project architecture overview
├── COMPONENTS.md                # Component reference guide
├── API_REFERENCE.md             # API endpoints documentation
├── FILE_STRUCTURE.md            # This file structure reference
├── index.html                   # Main PWA entry point
├── service-worker.js            # PWA offline functionality
├── manifest.json                # PWA configuration
├── package.json                 # Node.js dependencies
├── server.js                    # Development server (if exists)
├── start-dev.bat               # Development startup script
├── booking-website/            # Customer booking portal
├── marketing-website/          # Landing page and admin
├── pwa-backend/               # API server for PWA
├── js/                        # PWA JavaScript modules
├── css/                       # PWA styling
└── assets/                    # Images, icons, fonts
```

## PWA JavaScript Modules (`/js/`)
```
js/
├── database.js                # IndexedDB wrapper and schema
├── pos.js                     # Point of sale system
├── sync.js                    # Online/offline synchronization
├── unified-auth.js            # Cross-component authentication
├── dashboard.js               # Analytics and reporting
├── inventory.js               # Stock management
├── services.js                # Spa services management
├── employees.js               # Staff management
├── bookings.js                # Appointment scheduling
├── rooms.js                   # Room management
├── chatbot.js                 # AI assistant
├── profile.js                 # User profile management
└── performance.js             # Performance monitoring
```

## PWA Styling (`/css/`)
```
css/
├── styles.css                 # Main application styles
├── pos.css                    # POS-specific styling
├── dashboard.css              # Dashboard styling
├── mobile.css                 # Mobile-responsive styles
└── components/                # Component-specific CSS
```

## Booking Website (`/booking-website/`)
```
booking-website/
├── index.html                 # Main booking portal page
├── spa.js                     # Booking functionality
├── style.css                  # Booking portal styles
├── booking-confirmation.html  # Confirmation page
└── assets/                    # Booking-specific assets
```

## Marketing Website (`/marketing-website/`)
```
marketing-website/
├── server.js                  # Express server main file
├── package.json               # Dependencies
├── routes/                    # API route definitions
│   ├── auth.js               # Authentication routes
│   ├── admin.js              # Admin panel routes
│   └── api.js                # Public API routes
├── models/                    # MongoDB schemas
│   ├── User.js               # User model
│   ├── Business.js           # Business model
│   └── Subscription.js       # Subscription model
├── middleware/                # Express middleware
│   ├── auth.js               # Authentication middleware
│   └── validation.js         # Input validation
├── public/                    # Static assets
│   ├── index.html            # Landing page
│   ├── login.html            # Login form
│   ├── admin.html            # Admin dashboard
│   ├── style.css             # Marketing site styles
│   └── app.js                # Client-side JavaScript
└── views/                     # Template files (if using templating)
```

## PWA Backend (`/pwa-backend/`)
```
pwa-backend/
├── server.js                  # Main API server
├── package.json               # Dependencies
├── routes/                    # API route definitions
│   ├── auth.js               # Authentication endpoints
│   ├── users.js              # User management
│   ├── sync.js               # Data synchronization
│   └── catalog.js            # Public catalog APIs
├── models/                    # MongoDB schemas
│   ├── User.js               # User model
│   ├── Business.js           # Business model
│   ├── Service.js            # Service model
│   └── Appointment.js        # Appointment model
├── middleware/                # Express middleware
│   ├── auth.js               # JWT authentication
│   ├── rateLimiter.js        # Rate limiting
│   └── cors.js               # CORS configuration
└── utils/                     # Utility functions
    ├── jwt.js                # JWT token utilities
    └── validation.js         # Input validation helpers
```

## Key Configuration Files

### PWA Configuration
- `manifest.json` - PWA settings, icons, theme colors
- `service-worker.js` - Offline caching strategies
- `package.json` - Dependencies and build scripts

### Server Configuration
- `marketing-website/package.json` - Marketing site dependencies
- `pwa-backend/package.json` - Backend API dependencies
- `.env` files (if present) - Environment variables

## Asset Organization
```
assets/
├── icons/                     # PWA icons (various sizes)
├── images/                    # Application images
├── fonts/                     # Custom fonts
└── sounds/                    # Notification sounds (if any)
```

## Important Entry Points
- **PWA Main**: `index.html` - Progressive web app entry
- **Marketing**: `marketing-website/server.js` - Marketing site server
- **PWA Backend**: `pwa-backend/server.js` - API server
- **Booking Portal**: `booking-website/index.html` - Customer booking
- **Service Worker**: `service-worker.js` - Offline functionality

## Development Files
- `start-dev.bat` - Windows batch script for development
- Various `package.json` files with npm scripts
- Configuration files for different environments

## Database Schema Files
- IndexedDB schemas defined in `js/database.js`
- MongoDB schemas in respective `models/` directories
- Data synchronization logic in `js/sync.js` and backend sync routes