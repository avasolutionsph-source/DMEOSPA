# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ava Solutions PWA is a unified web application ecosystem consisting of a Progressive Web App (PWA), marketing website, and comprehensive backend API. The codebase recently underwent major refactoring to eliminate code duplication and implement unified utility systems.

## Common Commands

### Backend Development
```bash
# Start backend development server
cd backend && npm run dev

# Run backend tests with coverage
cd backend && npm test

# Run backend tests in watch mode
cd backend && npm run test:watch

# Run backend linting
cd backend && npm run lint

# Fix backend linting issues
cd backend && npm run lint:fix

# Run database migrations
cd backend && npm run migrate

# Seed database with test data
cd backend && npm run seed

# Docker operations
cd backend && npm run docker:build
cd backend && npm run docker:run

# PM2 process management
cd backend && npm run pm2:start
cd backend && npm run pm2:stop
cd backend && npm run pm2:restart
cd backend && npm run pm2:logs
```

### Marketing Website Development  
```bash
# Start marketing development server (with nodemon)
cd marketing-website && npm run dev

# Start marketing production server
cd marketing-website && npm start

# Seed marketing database
cd marketing-website && npm run seed

# Cleanup sample users
cd marketing-website && npm run cleanup
```

### PWA Development
```bash
# The PWA is a static frontend application - no build process required
# Serve locally for development (from root directory)
npx http-server PWA-Repository -p 8080 -c-1

# Or open directly in browser:
# file:///path/to/PWA-Repository/index.html
```

### Full Stack Development (Windows)
```bash
# Start all three servers simultaneously
./scripts/start-dev.bat

# Setup scripts for deployment preparation
./setup-pwa-repository.bat
./setup-marketing-repository.bat
```

## High-Level Architecture

### Repository Structure
The repository contains multiple applications:
- **backend/** - Unified Node.js/Express API server handling all backend operations
- **marketing-website/** - Marketing website with admin panel (Express + static files)  
- **PWA-Repository/** - Progressive Web App (vanilla JavaScript)
- **js/** - PWA JavaScript modules (legacy location, mainly for development)
- **docs/** - Technical documentation

### Database Architecture
- **MongoDB** - Primary database for all applications (users, products, inventory, transactions)
- **Unified Models** - Shared Mongoose models in `backend/models/`
- **Connection Pooling** - Database connection management via `backend/config/database.js`
- **Redis Caching** - Optional caching layer for performance optimization

### PWA Frontend Architecture
Modern modular JavaScript architecture with:
- **State Management** - Centralized StateManager with automatic UI updates
- **Unified Utilities** - Logger, notification, error handling, and API client systems
- **Component System** - HTML components loaded dynamically 
- **API Client** - Resource-specific API clients with automatic retry and error handling

### Authentication Flow
- **JWT Tokens** - Primary authentication method for API access
- **Session-based** - For marketing website (Passport.js with local and Google OAuth strategies)
- **Multi-level Auth** - User and admin authentication with role-based permissions
- **API Key Auth** - Alternative authentication via X-API-Key header

### Real-time Features
- **Socket.IO** - Real-time updates between PWA and backend
- **StateManager Integration** - Automatic state synchronization across clients
- **Live Data Sync** - Inventory, transactions, and employee data sync

### Unified Systems (Recently Implemented)
The codebase uses unified utility systems that eliminated 85% of code duplication:

#### Logging System
All logging goes through unified logger that works consistently across platforms:
```javascript
// Import the complete logger system
import './js/logger-complete.js';
// Use global logger functions available after import
```

#### State Management
Centralized state management with automatic UI synchronization:
```javascript
import StateManager from './js/state-manager.js';
```

#### API Client System
HTTP client with automatic retry, error handling, and authentication:
```javascript
import { api } from './js/api.js';
// Usage: await api.get('/products'), api.post('/users', data)
```

#### Backend Route Handlers
Unified CRUD route handlers with automatic pagination, search, and validation:
```javascript
import BaseRouteHandler from './backend/utils/base-route-handler.js';
```

## Key Patterns

### Frontend Development
1. **Use modular architecture** - Import specific modules as needed from `js/` directory
2. **Use StateManager** - Centralized state management with automatic UI updates
3. **Use unified logger** - Import `logger-complete.js` for consistent logging across components
4. **Follow component patterns** - Use existing patterns in `js/` modules for consistency
5. **Development workflow** - Work in `js/` directory, copy to `PWA-Repository/js/` for deployment

### Backend Development
1. **Use BaseRouteHandler** - Create CRUD routes with the unified base handler
2. **Unified error handling** - All routes use the consolidated error handling middleware
3. **Consistent logging** - Use Winston logger with structured logging
4. **Database patterns** - Use the database helper functions for connections and queries
5. **Authentication middleware** - Use the unified auth middleware for protected routes

### Code Organization
- **Modular CSS** - Styles are split into modular files in `src/css/`
- **Component-based HTML** - HTML components in `src/components/`
- **Utility-first JavaScript** - Core utilities in `js/utils/` and `src/js/utils/`
- **Resource-specific APIs** - Each data type has its own API module

## Important File Locations

### PWA Core Files
- `PWA-Repository/index.html` - Main PWA entry point
- `PWA-Repository/js/app.js` - Main application controller
- `PWA-Repository/js/state-manager.js` - Centralized state management
- `PWA-Repository/service-worker.js` - PWA service worker
- `PWA-Repository/manifest.json` - PWA manifest

### Backend Core Files  
- `backend/server.js` - Main Express server
- `backend/config/database.js` - MongoDB connection and helpers
- `backend/utils/base-route-handler.js` - Unified CRUD route handler
- `backend/middleware/errorHandler.js` - Unified error handling
- `backend/utils/logger.js` - Winston logging system

### JavaScript Modules (PWA)
- `js/` and `PWA-Repository/js/` - PWA JavaScript modules (development and production)
- `js/logger-complete.js` - Unified logging system
- `js/state-manager.js` - Centralized state management  
- `js/api.js` - HTTP API client
- `js/utilities.js` - Common utility functions
- `js/auth.js` - Authentication handling

### Documentation
- `TEAM_GUIDE.md` - Comprehensive guide for using unified systems
- `API_REFERENCE.md` - Technical reference for all utilities
- `PROJECT-STRUCTURE.md` - Detailed file organization documentation
- `PROJECT_STATUS.md` - Current project status and completed improvements

## Development Workflow

### Making Changes to PWA
1. Work in the `js/` directory for development
2. Copy changes to `PWA-Repository/js/` for production deployment
3. Test locally by serving PWA-Repository with http-server or opening index.html directly
4. Use browser developer tools for debugging and validation
5. No build process required - vanilla JavaScript modules

### Making Changes to Backend
1. All backend changes in `backend/` directory
2. Use BaseRouteHandler for new CRUD endpoints (`backend/utils/base-route-handler.js`)
3. Follow existing patterns for authentication (`backend/middleware/auth.js`) and error handling
4. Run tests with `npm test` and linting with `npm run lint`
5. Use nodemon for automatic reloading during development (`npm run dev`)

### Database Changes
1. Update Mongoose models in `backend/models/`
2. Run migrations with `cd backend && npm run migrate`
3. Test with seed data using `cd backend && npm run seed`
4. Connection configuration in `backend/config/database.js`

## Testing Strategy
- **Backend Tests** - Jest testing framework with supertest for API testing (`cd backend && npm test`)
- **Test Coverage** - Run with coverage report (`cd backend && npm test`)
- **Watch Mode** - Continuous testing during development (`cd backend && npm run test:watch`)
- **Frontend Testing** - Manual browser testing (no automated test suite configured)
- **Database Testing** - Seed scripts for consistent test data (`cd backend && npm run seed`)
- **Integration Testing** - Test PWA with backend API during development

## Performance Considerations
- **Modular Loading** - JavaScript modules loaded on demand
- **Connection Pooling** - Database connections shared across requests  
- **Caching** - Redis caching for frequently accessed data
- **Code Elimination** - Unified systems eliminated 85% of duplicate code
- **Bundle Size** - Modular CSS and JS reduce overall bundle size

## Deployment Architecture
- **Backend** - Node.js/Express server (port 4000) - deployable to Render/Railway/Heroku
- **PWA** - Static site deployable to Netlify (configured in `PWA-Repository/netlify.toml`)
- **Marketing** - Express server (port 3001) - can be deployed separately or integrated
- **Database** - MongoDB (local or Atlas for production)
- **Real-time** - Socket.IO integrated with backend for live updates

## API Endpoints Reference

### Core API Routes (Backend port 4000)
- `GET /health` - Health check
- `GET /api/health` - API health status
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/products` - Product management
- `GET /api/inventory` - Inventory tracking
- `GET /api/employees` - Employee management
- `GET /api/transactions` - Transaction history
- `GET /api/sync/pull` - Pull sync data
- `POST /api/sync/push` - Push sync data

### WebSocket Events
- `connection` - Client connected
- `authenticate` - Socket authentication
- `state:sync` - State synchronization
- `inventory:changed` - Inventory updates
- `transaction:new` - New transactions

This codebase prioritizes maintainability, performance, and developer experience through unified systems and consistent patterns.