# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ava Solutions PWA is a unified web application ecosystem consisting of a Progressive Web App (PWA), marketing website, and comprehensive backend API. The codebase recently underwent major refactoring to eliminate code duplication and implement unified utility systems.

## Common Commands

### Backend Development
```bash
# Start backend development server
cd backend && npm run dev

# Run backend tests
cd backend && npm test

# Run backend linting
cd backend && npm run lint

# Fix backend linting issues
cd backend && npm run lint:fix

# Run backend build/validation
cd backend && npm run build
```

### Marketing Website Development  
```bash
# Start marketing development server
cd marketing-website && npm run dev

# Start marketing production server
cd marketing-website && npm start

# Seed marketing database
cd marketing-website && npm run seed
```

### PWA Development
The PWA is a frontend-only application that connects to the backend API. It uses vanilla JavaScript with modular architecture.

### Testing
```bash
# Backend tests with coverage
cd backend && npm run test

# Watch mode testing
cd backend && npm run test:watch

# Frontend testing - manual testing via browser with PWA/marketing sites
# No automated frontend test suite currently configured
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
- **Unified Models** - Shared Mongoose models across all applications
- **Connection Pooling** - Single database connection shared by all services

### PWA Frontend Architecture
Modern modular JavaScript architecture with:
- **State Management** - Centralized StateManager with automatic UI updates
- **Unified Utilities** - Logger, notification, error handling, and API client systems
- **Component System** - HTML components loaded dynamically 
- **API Client** - Resource-specific API clients with automatic retry and error handling

### Authentication Flow
- **JWT Tokens** - Primary authentication method
- **Session-based** - For marketing website (Passport.js)
- **Multi-level Auth** - User and admin authentication with role-based permissions

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
2. Copy changes to `PWA-Repository/js/` for deployment
3. Test manually with browser by opening `PWA-Repository/index.html`
4. Use browser developer tools for debugging and validation

### Making Changes to Backend
1. All backend changes in `backend/` directory
2. Use BaseRouteHandler for new CRUD endpoints
3. Follow existing patterns for authentication and error handling
4. Run tests to ensure compatibility

### Database Changes
1. Update Mongoose models in `backend/models/`
2. Create migration scripts if needed with `backend/scripts/migrate.js`
3. Test with seed data using `npm run seed`

## Testing Strategy
- **Backend Tests** - Jest testing framework with supertest for API testing
- **Frontend Testing** - Manual browser testing with PWA and marketing sites
- **Database Testing** - Seed scripts for consistent test data via `npm run seed`
- **Integration Testing** - Test PWA with backend API during development

## Performance Considerations
- **Modular Loading** - JavaScript modules loaded on demand
- **Connection Pooling** - Database connections shared across requests  
- **Caching** - Redis caching for frequently accessed data
- **Code Elimination** - Unified systems eliminated 85% of duplicate code
- **Bundle Size** - Modular CSS and JS reduce overall bundle size

## Deployment Architecture
- **Backend** - Deployed to Render/Railway as unified API server
- **PWA** - Deployed to Netlify as static PWA
- **Marketing** - Can be deployed separately or served by backend
- **Database** - MongoDB Atlas for production
- **Real-time** - Socket.IO for live updates

This codebase prioritizes maintainability, performance, and developer experience through unified systems and consistent patterns.