# 🔧 API Reference - Unified Utilities

Detailed technical reference for all unified utility systems.

## 📝 Logger System

### UnifiedLogger Class

```javascript
import { UnifiedLogger } from './src/js/utils/unified-logger.js';

const logger = new UnifiedLogger('MODULE_NAME');
```

#### Methods

```javascript
// Basic logging methods
logger.debug(message, data);
logger.info(message, data);  
logger.warn(message, data);
logger.error(message, data);

// Safe logging (with fallbacks)
import { safeLog } from './src/js/utils/unified-logger.js';
safeLog('INFO', 'message', { category: 'CATEGORY' });
```

#### Configuration

```javascript
const logger = new UnifiedLogger('APP', {
    minLevel: 'INFO',        // Minimum log level
    enableConsole: true,     // Console output
    enableStorage: false,    // IndexedDB storage
    maxStorageSize: 1000    // Max stored log entries
});
```

### Logger Helper Functions

```javascript
import { 
    logError, logInfo, logDebug, logSuccess, 
    safeAsyncOperation 
} from './src/js/utils/logger-helper.js';

// Simple logging
logInfo('Operation started', { category: 'API' });
logError('Operation failed', { category: 'API', error: errorObject });
logDebug('Debug info', { category: 'DEBUG', data: debugData });
logSuccess('Operation completed', 'API');

// Async operation wrapper
const result = await safeAsyncOperation(
    'loading products',           // operation description
    async () => {                // async function
        return await fetch('/api/products');
    },
    'PRODUCTS'                   // category
);
```

## 🔔 Notification System

### Basic Functions

```javascript
import { 
    showSuccess, showError, showWarning, showInfo,
    showNotification 
} from './src/js/utils/notification-manager.js';

// Simple notifications
showSuccess('Operation successful');
showError('Operation failed');
showWarning('Warning message');
showInfo('Information message');

// Advanced notification
const notificationId = showNotification('Message', 'type', {
    title: 'Custom Title',
    duration: 5000,              // ms, 0 for persistent
    persistent: false,           // true = manual dismiss only
    position: 'top-right',       // top-right, top-left, etc.
    onClick: () => {},           // click handler
    onClose: () => {},           // close handler
    className: 'custom-class'    // additional CSS class
});
```

### NotificationManager Class

```javascript
import { NotificationManager } from './src/js/utils/notification-manager.js';

const manager = new NotificationManager();

// Queue multiple notifications
manager.queue('Message 1', 'success');
manager.queue('Message 2', 'info');
manager.processQueue(); // Show all queued notifications

// Remove specific notification
manager.remove(notificationId);

// Remove all notifications
manager.removeAll();

// Clear queue
manager.clearQueue();
```

### Auto-Detection

```javascript
// These messages are automatically categorized:
showNotification('Success! Data saved', 'auto');     // → success
showNotification('Error: Could not save', 'auto');   // → error  
showNotification('Warning: Low stock', 'auto');      // → warning
showNotification('Info: Processing...', 'auto');     // → info
```

## 🛡️ Error Handling

### Error Handler Functions

```javascript
import { 
    withErrorHandling, handleError, ErrorTypes 
} from './src/js/utils/error-handler.js';

// Wrapper for operations that might fail
const result = await withErrorHandling(
    async () => {
        // Your risky operation
        return await fetch('/api/data');
    },
    {
        category: 'API',                    // Log category
        operation: 'fetch_data',            // Operation name
        userMessage: 'Could not load data', // User-facing message
        type: ErrorTypes.NETWORK,           // Error type
        retryable: true,                   // Can be retried
        silent: false                      // Don't show notification
    }
);

// Manual error handling
handleError(error, {
    category: 'PRODUCTS',
    operation: 'create_product',
    type: ErrorTypes.VALIDATION,
    userMessage: 'Invalid product data'
});
```

### Error Types

```javascript
ErrorTypes.NETWORK     // Network/connectivity issues
ErrorTypes.VALIDATION  // Data validation errors  
ErrorTypes.SYSTEM      // Application/system errors
ErrorTypes.AUTH        // Authentication/authorization errors
```

### Error Context Properties

```javascript
{
    category: 'string',      // Required: Error category
    operation: 'string',     // Required: What was being done
    type: ErrorTypes,        // Optional: Error type
    userMessage: 'string',   // Optional: User-facing message
    retryable: boolean,      // Optional: Can operation be retried
    silent: boolean,         // Optional: Don't show notification
    data: object            // Optional: Additional context data
}
```

## 🔌 API Client System

### BaseAPIClient Class

```javascript
import { BaseAPIClient } from './src/js/utils/base-api-client.js';

const client = new BaseAPIClient({
    baseURL: '/api',
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// HTTP methods
const data = await client.get('/products');
const result = await client.post('/products', productData);
await client.put('/products/123', updateData);
await client.patch('/products/123', partialData);
await client.delete('/products/123');

// With custom config
const data = await client.get('/products', {
    timeout: 5000,
    retries: 1,
    headers: { 'Custom-Header': 'value' }
});
```

### Pre-configured API Client

```javascript
import { apiClient } from './src/js/utils/base-api-client.js';

// Ready-to-use client with default configuration
const data = await apiClient.get('/products');
```

### Resource APIs

```javascript
import { productsAPI, authAPI } from './src/js/utils/resource-apis.js';

// Products API
const products = await productsAPI.list({ page: 1, limit: 20 });
const product = await productsAPI.get(productId);
const created = await productsAPI.create(productData);
const updated = await productsAPI.update(productId, updateData);
await productsAPI.delete(productId);

// Auth API
const session = await authAPI.validateSession();
const loginResult = await authAPI.login(credentials);
await authAPI.logout();
await authAPI.refreshToken();
```

### Creating Custom Resource APIs

```javascript
import { createResourceAPI } from './src/js/utils/resource-apis.js';

export const customAPI = createResourceAPI('/api/custom', {
    // Add custom methods
    async customAction(id, data) {
        return await this.client.post(`${this.basePath}/${id}/action`, data);
    },
    
    async bulkOperation(items) {
        return await this.client.post(`${this.basePath}/bulk`, { items });
    }
});

// Usage
const result = await customAPI.customAction(123, actionData);
const bulkResult = await customAPI.bulkOperation(itemsArray);
```

## 🗄️ Backend Route Handler

### BaseRouteHandler Class

```javascript
import BaseRouteHandler from './utils/base-route-handler.js';
import Model from '../models/Model.js';

const handler = new BaseRouteHandler(Model, {
    populate: ['field1', 'field2'],     // Fields to populate
    searchFields: ['name', 'email'],     // Searchable fields
    sortField: 'name',                   // Default sort field
    sortOrder: 1,                        // 1 ascending, -1 descending
    requiredFields: ['name', 'email'],   // Required for creation
    uniqueFields: ['email'],             // Must be unique per user
    ownerField: 'userId',                // Links records to user
    defaultLimit: 50,                    // Default page size
    maxLimit: 200                        // Maximum page size
});

// Create all CRUD routes
const router = express.Router();
handler.createRoutes(router);
```

### Generated Routes

The base handler automatically creates these routes:

```javascript
GET    /           // List with pagination, search, sort
GET    /:id        // Get single item by ID
POST   /           // Create new item
PUT    /:id        // Update entire item
PATCH  /:id        // Partial update
DELETE /:id        // Delete item
```

### Query Parameters for GET /

```javascript
// Pagination
?page=1&limit=20

// Search (searches all searchFields)
?search=john

// Sorting
?sortBy=name&sortOrder=asc  // or desc

// Filtering
?field=value&anotherField=anotherValue

// Population
?populate=field1,field2
```

### Response Format

All routes return consistent JSON responses:

```javascript
// Success response
{
    success: true,
    data: {...},           // Single item or array
    pagination: {          // Only for list endpoints
        page: 1,
        limit: 20,
        total: 100,
        pages: 5
    },
    message: "Optional success message"
}

// Error response  
{
    success: false,
    error: {
        message: "Error description",
        code: "ERROR_CODE",
        details: {...}     // Optional additional details
    }
}
```

### Custom Validation

```javascript
const handler = new BaseRouteHandler(Model, {
    requiredFields: ['name'],
    customValidation: async (data, isUpdate = false) => {
        if (!isUpdate && data.email && await Model.findOne({ email: data.email })) {
            throw new Error('Email already exists');
        }
        
        if (data.age && data.age < 18) {
            throw new Error('Age must be 18 or older');
        }
    }
});
```

## 🔧 Utility Functions

### Async Operation Helpers

```javascript
import { safeAsyncOperation } from './src/js/utils/logger-helper.js';

// Wraps async operations with logging
const result = await safeAsyncOperation(
    'operation description',
    async () => {
        // Your async operation
        return await someAsyncFunction();
    },
    'CATEGORY_NAME'  // Optional category
);
```

### Notification Helpers

```javascript
import { NotificationManager } from './src/js/utils/notification-manager.js';

const manager = new NotificationManager();

// Batch notifications
manager.batchNotify([
    { message: 'First message', type: 'success' },
    { message: 'Second message', type: 'info' }
]);

// Conditional notifications
manager.conditionalNotify(
    condition,  // boolean
    'Message if true',
    'success',
    'Message if false',
    'error'
);
```

## 🎨 CSS Integration

### Notification Styles

The notification system automatically injects CSS. You can override with:

```css
/* Custom notification container */
.ava-notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
}

/* Custom notification styles */
.ava-notification {
    min-width: 300px;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Type-specific styles */
.ava-notification.success { background: #10b981; }
.ava-notification.error { background: #ef4444; }
.ava-notification.warning { background: #f59e0b; }
.ava-notification.info { background: #3b82f6; }
```

## 📊 Performance Considerations

### Logger Performance
- Console logging is synchronous
- IndexedDB storage is asynchronous and batched
- Log rotation prevents memory leaks
- Configurable minimum log levels reduce overhead

### Notification Performance  
- CSS animations use GPU acceleration
- Automatic cleanup of dismissed notifications
- Queue system prevents notification spam
- Configurable limits on active notifications

### API Client Performance
- Connection pooling for HTTP requests
- Automatic retry with exponential backoff
- Request/response interceptors for common operations
- Configurable timeout and retry policies

---

*Complete API reference for all unified utility systems in the Ava Solutions PWA project.*