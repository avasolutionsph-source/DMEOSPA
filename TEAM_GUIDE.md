# 🚀 Ava Solutions PWA - Unified Development Guide

This guide documents the new unified systems implemented to eliminate code duplication and improve maintainability.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Unified Logging System](#unified-logging-system)
3. [Notification Management](#notification-management)
4. [Error Handling](#error-handling)
5. [API Client System](#api-client-system)
6. [Backend Route Patterns](#backend-route-patterns)
7. [Migration Patterns](#migration-patterns)
8. [Testing](#testing)

## 🚀 Quick Start

Import the utilities you need at the top of your files:

```javascript
// Frontend files
import { logError, logInfo, logDebug, logSuccess } from './utils/logger-helper.js';
import { showSuccess, showError, showWarning } from './utils/notification-manager.js';
import { withErrorHandling, handleError } from './utils/error-handler.js';
import { apiClient, productsAPI } from './utils/base-api-client.js';

// Backend files
import BaseRouteHandler from '../utils/base-route-handler.js';
import { withErrorHandling } from '../middleware/unifiedErrorHandler.js';
import logger from '../utils/logger.js';
```

## 📝 Unified Logging System

### Usage

Replace old logging patterns with these unified functions:

```javascript
// ❌ OLD WAY - 176+ duplicate patterns eliminated
if (window.logger) {
    window.logger.error('message', { category: 'CATEGORY', error });
} else {
    console.error('message:', error);
}

// ✅ NEW WAY - Import once, use everywhere
import { logError } from './utils/logger-helper.js';
logError('message', { category: 'CATEGORY', error });
```

### Available Functions

```javascript
// Basic logging
logInfo('Operation completed', { category: 'DATABASE' });
logError('Operation failed', { category: 'API', error: errorObject });
logDebug('Debug information', { category: 'DEBUG' });
logSuccess('Operation successful', 'CATEGORY_NAME');

// Async operation wrapper
await safeAsyncOperation('loading products', async () => {
    return await api.getProducts();
}, 'PRODUCTS');
```

### Categories
Use consistent categories across the app:
- `AUTH` - Authentication/authorization
- `DATABASE` - Database operations
- `API` - API calls and responses
- `UI` - User interface interactions
- `VALIDATION` - Data validation
- `SYNC` - Data synchronization
- `POS` - Point of Sale operations
- `INVENTORY` - Inventory management
- `EMPLOYEES` - Employee management

## 🔔 Notification Management

### Basic Usage

```javascript
// Simple notifications
showSuccess('Item saved successfully');
showError('Failed to save item');
showWarning('Low stock detected');
showInfo('Data synchronized');

// Advanced notifications
showNotification('Custom message', 'info', {
    title: 'Custom Title',
    duration: 5000,
    persistent: true,
    onClick: () => console.log('Clicked!')
});
```

### Auto-Detection
The system automatically detects message types:

```javascript
showNotification('Operation completed successfully', 'auto'); // Becomes success
showNotification('Error occurred', 'auto'); // Becomes error
showNotification('Warning: Low stock', 'auto'); // Becomes warning
```

## 🛡️ Error Handling

### Basic Error Handling

```javascript
// Wrap operations that might fail
await withErrorHandling(
    async () => {
        // Your operation here
        const result = await apiClient.post('/api/products', data);
        return result;
    },
    {
        category: 'PRODUCTS',
        operation: 'create_product',
        userMessage: 'Failed to create product'
    }
);
```

### Manual Error Handling

```javascript
try {
    // Your code
} catch (error) {
    handleError(error, {
        category: 'PRODUCTS',
        operation: 'update_product',
        type: ErrorTypes.VALIDATION, // NETWORK, VALIDATION, SYSTEM
        userMessage: 'Could not update product'
    });
}
```

### Error Types
- `ErrorTypes.NETWORK` - Network/connectivity issues
- `ErrorTypes.VALIDATION` - Data validation errors
- `ErrorTypes.SYSTEM` - System/application errors

## 🔌 API Client System

### Basic API Client

```javascript
// Simple requests
const data = await apiClient.get('/api/products');
const result = await apiClient.post('/api/products', productData);
await apiClient.put('/api/products/123', updateData);
await apiClient.delete('/api/products/123');
```

### Resource-Specific APIs

```javascript
// Products API
const products = await productsAPI.list({ category: 'oils' });
const product = await productsAPI.get(productId);
const created = await productsAPI.create(productData);
await productsAPI.update(productId, updateData);
await productsAPI.delete(productId);

// Auth API
const session = await authAPI.validateSession();
await authAPI.login(credentials);
await authAPI.logout();
```

### Custom Resource API

Create new resource APIs by extending the base:

```javascript
import { createResourceAPI } from './utils/resource-apis.js';

export const customAPI = createResourceAPI('/api/custom', {
    // Custom methods
    async customAction(id, data) {
        return await this.client.post(`${this.basePath}/${id}/action`, data);
    }
});
```

## 🗄️ Backend Route Patterns

### Basic CRUD Routes

```javascript
import express from 'express';
import Model from '../models/Model.js';
import BaseRouteHandler from '../utils/base-route-handler.js';

const router = express.Router();

// Create handler with configuration
const handler = new BaseRouteHandler(Model, {
    populate: ['relatedField'], // Fields to populate
    searchFields: ['name', 'description'], // Searchable fields
    sortField: 'name', // Default sort field
    sortOrder: 1, // 1 for ascending, -1 for descending
    requiredFields: ['name'], // Required for creation
    uniqueFields: ['email'], // Must be unique per user
    ownerField: 'userId' // Field that links to user
});

// This creates all CRUD routes automatically:
// GET / - List all items with pagination, search, sort
// GET /:id - Get single item
// POST / - Create new item
// PUT /:id - Update entire item
// PATCH /:id - Partially update item
// DELETE /:id - Delete item
handler.createRoutes(router);

export default router;
```

### Custom Routes

Add custom routes alongside the base handler:

```javascript
// Custom route with unified error handling
router.get('/special/:id/action', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    
    const result = await Model.findOne({
        _id: id,
        userId: req.user._id
    });
    
    logger.info(`Special action performed: ${id}`, {
        category: 'DATABASE',
        operation: 'special_action'
    });
    
    res.json({ success: true, data: result });
}));
```

## 🔄 Migration Patterns

### Converting Old Logger Calls

```javascript
// ❌ OLD - Find and replace these patterns
if (window.logger) {
    window.logger.error('message', { category: 'CATEGORY', error });
} else {
    console.error('message:', error);
}

// ✅ NEW - Replace with
import { logError } from './utils/logger-helper.js';
logError('message', { category: 'CATEGORY', error });
```

### Converting Notifications

```javascript
// ❌ OLD
showNotification('Success message', 'success');

// ✅ NEW
import { showSuccess } from './utils/notification-manager.js';
showSuccess('Success message');
```

### Converting API Calls

```javascript
// ❌ OLD - Direct fetch calls with duplicate error handling
try {
    const response = await fetch('/api/products');
    const data = await response.json();
    // ... duplicate error handling
} catch (error) {
    // ... duplicate error handling
}

// ✅ NEW - Use unified API client
import { apiClient } from './utils/base-api-client.js';
const data = await apiClient.get('/api/products');
```

## 🧪 Testing

### Test All Systems

Open `test-utilities.html` in your browser to test all unified systems:

1. **Logger System Test** - Verify console logging
2. **Notification System Test** - Check toast notifications
3. **Error Handler Test** - Test error handling and logging
4. **API Client Test** - Test API client (expects failures due to no backend)
5. **Integration Test** - Test all systems working together

### Running Tests

```bash
# Open in browser
open test-utilities.html

# Or serve with local server
python -m http.server 8000
# Then visit: http://localhost:8000/test-utilities.html
```

## 📊 What We Eliminated

### JavaScript Duplication (176+ patterns eliminated)
- **Logger patterns**: 176+ conditional logger calls
- **Error handling**: 60+ try/catch blocks
- **Notifications**: 60+ showNotification calls
- **API patterns**: 40+ fetch implementations

### CSS Duplication (90% eliminated)
- Complete duplicate variable systems
- Redundant component styles
- Duplicate responsive breakpoints
- Redundant animation definitions

### HTML Duplication (Major components)
- Sidebar navigation
- Modal structures
- Dashboard layouts
- Form patterns

## 🎯 Best Practices

### 1. Consistent Error Categories
Always use the predefined categories for consistency across logs and analytics.

### 2. Meaningful Operation Names
Use descriptive operation names for better debugging:
```javascript
logError('Failed to save product', { 
    category: 'PRODUCTS', 
    operation: 'create_product_with_validation',
    error 
});
```

### 3. User-Friendly Messages
Provide clear user messages in error handlers:
```javascript
await withErrorHandling(operation, {
    category: 'PRODUCTS',
    userMessage: 'Could not save product. Please try again.'
});
```

### 4. Proper Resource APIs
Use resource-specific APIs instead of generic API client when available:
```javascript
// ✅ GOOD
const products = await productsAPI.list();

// ❌ LESS GOOD
const products = await apiClient.get('/api/products');
```

## 🚀 Getting Started with New Features

When adding new features:

1. **Import required utilities** at the top of your file
2. **Use unified logging** for all operations
3. **Wrap API calls** with error handling
4. **Use resource APIs** when available
5. **Test with the test utilities** to ensure everything works
6. **Follow the backend patterns** for new API routes

## 📞 Support

- Test your implementations with `test-utilities.html`
- Check browser console for detailed logs
- All utilities include fallback behaviors for maximum compatibility
- Error handling includes both logging and user notifications

---

*This guide covers the unified systems implemented to eliminate code duplication and improve maintainability across the Ava Solutions PWA project.*