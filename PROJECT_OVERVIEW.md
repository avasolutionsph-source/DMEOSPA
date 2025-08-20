# AvasolutionsWebApp - Project Overview

## Architecture
Three-server microservices architecture for comprehensive spa/wellness business management:

1. **Main PWA Application** (Port 8080)
   - Core business management system
   - Offline-first Progressive Web App
   - Location: Root directory

2. **Marketing Website** (Port 3000/3001)
   - Landing page and user registration
   - Admin panel for business management
   - Location: `/marketing-website`

3. **PWA Backend** (Port 4000)
   - API server for PWA data synchronization
   - Authentication and user management
   - Location: `/pwa-backend`

4. **Booking Website** (Static)
   - Customer-facing appointment booking
   - Location: `/booking-website`

## Core Technologies
- **Frontend**: Vanilla JavaScript, HTML5/CSS3, PWA, IndexedDB
- **Backend**: Node.js, Express.js, MongoDB with Mongoose
- **Authentication**: JWT tokens, bcrypt password hashing
- **Database**: MongoDB Atlas (cloud) + IndexedDB (offline)
- **Deployment**: Netlify (frontend), Render/Railway (backend)

## Key Features
- **POS System** - Point of sale with cart, employee assignment, room integration
- **Service Management** - Spa services, treatments, pricing catalog
- **Inventory Management** - Stock tracking, SKU management, POS integration
- **Employee Management** - Staff profiles, payroll, portal access
- **Booking System** - Appointment scheduling with availability checking
- **Room Management** - Room assignments and status tracking
- **AI Assistant** - Business intelligence chatbot
- **Analytics Dashboard** - Business insights and reporting
- **Offline Support** - Full functionality without internet connection

## Data Flow
1. **Authentication**: Unified JWT-based auth across all components
2. **Offline-First**: PWA uses IndexedDB, syncs when online
3. **Real-time Sync**: Background synchronization with conflict resolution
4. **Multi-tenant**: Branch-aware data for multi-location businesses

## Security Features
- JWT authentication with secure token handling
- CORS configuration for cross-origin requests
- Rate limiting and API protection
- Input validation with express-validator
- Helmet security headers
- bcrypt password hashing

## Deployment
- **PWA**: https://ava-solutions-pwa.netlify.app
- **Booking Website**: https://avaphbooking.netlify.app
- **Marketing**: https://marketing-website-sz2b.onrender.com
- **PWA Backend**: https://ava-pwa-backend.onrender.com
- **Database**: MongoDB Atlas cluster