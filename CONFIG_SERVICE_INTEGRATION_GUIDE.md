# Configuration Service Integration Guide

## Overview

This guide explains how to gradually integrate the unified configuration service into your Ava Solutions PWA while maintaining full backward compatibility with existing code.

## Quick Start

### 1. Include the Configuration Service

Add to your HTML files:

```html
<!-- Include before other app scripts -->
<script src="js/config-service.js"></script>
```

### 2. Basic Usage

```javascript
// Get configuration values
const businessName = await config.get('businessName');
const theme = await config.get('theme');
const apiUrl = await config.get('apiUrl');

// Set configuration values
await config.set('businessName', 'My Spa Business');
await config.set('theme', 'dark');
await config.set('performanceMode', 'high');
```

### 3. Replace Existing Code Gradually

**Before (old way):**
```javascript
const businessName = localStorage.getItem('businessName');
const perfMode = localStorage.getItem('perfMode');
```

**After (unified way):**
```javascript
const businessName = await config.get('businessName');
const perfMode = await config.get('performanceMode');
```

## Available Configuration Keys

### Core Settings
- `businessName` - Business name (string)
- `apiUrl` - API endpoint URL (string)
- `theme` - UI theme: 'light', 'dark', 'auto' (string)
- `performanceMode` - Performance mode: 'low', 'balanced', 'high', 'auto' (string)

### Authentication
- `userToken` - Authentication token (string, sensitive)
- `currentUser` - Current user data (object, sensitive)
- `isLoggedIn` - Login status (boolean)
- `subscriptionPlan` - Subscription plan: 'unpaid', 'pro' (string)

### Business Configuration
- `businessConfig` - Complete business configuration (object)
- `lastSync` - Last synchronization timestamp (number)

### Development
- `debugMode` - Debug mode enabled (boolean)
- `loggingEnabled` - Application logging enabled (boolean)
- `backupEnabled` - Automatic backup enabled (boolean)

## Migration Strategy

### Phase 1: Add Configuration Service (Safe)

1. Include `js/config-service.js` in your pages
2. Test using the demo page: `config-service-demo.html`
3. Verify backward compatibility with existing localStorage/IndexedDB

### Phase 2: Replace New Code (Recommended)

For new features, use the configuration service:

```javascript
// New feature example
async function initializeNewFeature() {
    const enabled = await config.get('newFeatureEnabled', false);
    if (enabled) {
        // Initialize new feature
    }
}
```

### Phase 3: Gradual Replacement (Optional)

Replace existing configuration code gradually:

**Settings Page Example:**
```javascript
// Replace this gradually
const oldSaveSettings = () => {
    localStorage.setItem('businessName', businessNameInput.value);
    localStorage.setItem('perfMode', perfModeSelect.value);
};

// With this
const newSaveSettings = async () => {
    await config.set('businessName', businessNameInput.value);
    await config.set('performanceMode', perfModeSelect.value);
};
```

### Phase 4: Full Integration (Future)

Eventually replace all direct localStorage/IndexedDB access with the configuration service.

## Backward Compatibility

### Automatic Migration

The configuration service automatically migrates existing settings:

- `localStorage.perfMode` → `config.get('performanceMode')`
- `localStorage.businessName` → `config.get('businessName')`
- `IndexedDB.settings.apiUrl` → `config.get('apiUrl')`

### Dual Storage

Initially, the service writes to both old and new storage:

```javascript
await config.set('businessName', 'New Name');
// ✅ Writes to unified config store
// ✅ Also writes to localStorage.businessName (backward compatibility)
// ✅ Also writes to IndexedDB.settings.businessName (backward compatibility)
```

### Safe Fallbacks

The service reads from multiple sources in priority order:

```javascript
// For 'businessName', it checks:
// 1. IndexedDB.settings.businessName.value
// 2. localStorage.businessName  
// 3. Hard-coded default
```

## Integration Examples

### Example 1: Settings Page Integration

```javascript
// In js/settings.js - Replace gradually
class SettingsManager {
    async loadSettings() {
        // New way (preferred)
        const businessName = await config.get('businessName');
        const performanceMode = await config.get('performanceMode');
        const theme = await config.get('theme');
        
        // Update UI
        document.getElementById('businessNameInput').value = businessName;
        document.getElementById('perfModeSelect').value = performanceMode;
        document.getElementById('themeSelect').value = theme;
    }
    
    async saveSettings() {
        // New way (preferred)
        const businessName = document.getElementById('businessNameInput').value;
        const performanceMode = document.getElementById('perfModeSelect').value;
        const theme = document.getElementById('themeSelect').value;
        
        await config.setMultiple({
            businessName,
            performanceMode,
            theme
        });
        
        showNotification('Settings saved successfully', 'success');
    }
}
```

### Example 2: App Initialization

```javascript
// In index.html or main app file
async function initializeApp() {
    // Wait for config service to be ready
    while (!window.config || !window.config.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Get configuration
    const performanceMode = await config.get('performanceMode');
    const theme = await config.get('theme');
    const debugMode = await config.get('debugMode');
    
    // Apply configuration
    if (performanceMode === 'low') {
        document.documentElement.classList.add('perf-low');
    }
    
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme');
    }
    
    if (debugMode) {
        console.log('Debug mode enabled');
    }
}

// Call during app startup
document.addEventListener('DOMContentLoaded', initializeApp);
```

### Example 3: API Configuration

```javascript
// In js/api.js - Replace API URL handling
class APIClient {
    constructor() {
        this.baseURL = null;
        this.initializeURL();
    }
    
    async initializeURL() {
        // New way - gets from unified config with fallbacks
        this.baseURL = await config.get('apiUrl');
        console.log('API URL loaded:', this.baseURL);
    }
    
    async updateAPIURL(newURL) {
        // New way - updates everywhere with backward compatibility
        await config.set('apiUrl', newURL);
        this.baseURL = newURL;
    }
}
```

### Example 4: Theme Management

```javascript
// Theme switching with config service
async function setTheme(themeName) {
    await config.set('theme', themeName);
    applyTheme(themeName);
}

async function initializeTheme() {
    const theme = await config.get('theme');
    applyTheme(theme);
    
    // Listen for theme changes
    config.listen('theme', (newTheme) => {
        applyTheme(newTheme);
    });
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme');
    } else if (theme === 'light') {
        document.documentElement.classList.remove('dark-theme');
    } else {
        // Auto theme - detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.classList.add('dark-theme');
        } else {
            document.documentElement.classList.remove('dark-theme');
        }
    }
}
```

## Advanced Features

### Event Listeners

Listen for configuration changes:

```javascript
// Listen for specific changes
const unsubscribe = config.listen('theme', (newTheme) => {
    console.log('Theme changed to:', newTheme);
    applyTheme(newTheme);
});

// Unsubscribe when no longer needed
unsubscribe();
```

### Batch Operations

Handle multiple configurations efficiently:

```javascript
// Get multiple values at once
const settings = await config.getMultiple([
    'businessName', 
    'theme', 
    'performanceMode'
]);

// Set multiple values at once
await config.setMultiple({
    businessName: 'New Business',
    theme: 'dark',
    performanceMode: 'high'
});

// Get all settings by category
const uiSettings = await config.getCategory('ui');
const authSettings = await config.getCategory('auth');
```

### Export/Import

Backup and restore configurations:

```javascript
// Export all configurations
const exportData = await config.exportConfig();
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
// ... create download

// Import configurations
const importData = JSON.parse(importJson);
const success = await config.importConfig(importData);
```

## Testing

### 1. Use the Demo Page

Open `config-service-demo.html` to:
- Test all configuration operations
- Verify backward compatibility
- Check migration status
- Compare storage systems

### 2. Verify Backward Compatibility

```javascript
// Test that old code still works
localStorage.setItem('businessName', 'Test Business');
const configValue = await config.get('businessName');
console.log('Backward compatibility:', configValue === 'Test Business');

// Test that new code updates old storage
await config.set('businessName', 'New Business');
const oldValue = localStorage.getItem('businessName');
console.log('Forward compatibility:', oldValue === 'New Business');
```

### 3. Monitor Migrations

```javascript
// Check migration status
const migrationComplete = await config.isMigrationComplete('localStorage_to_unified_v1');
console.log('Migration complete:', migrationComplete);
```

## Performance Considerations

### Caching

The service includes automatic caching:

- Values cached for 30 seconds
- Cache cleared automatically on updates
- Manual cache clearing available: `config.clearCache()`

### Batch Operations

Use batch operations for better performance:

```javascript
// Prefer this
const configs = await config.getMultiple(['key1', 'key2', 'key3']);

// Over this
const config1 = await config.get('key1');
const config2 = await config.get('key2');
const config3 = await config.get('key3');
```

## Security

### Sensitive Data

Sensitive configurations are handled specially:

- Not included in exports
- Not logged
- Stored securely

```javascript
// These are marked as sensitive
const userToken = await config.get('userToken');
const currentUser = await config.get('currentUser');
```

### Validation

All values are validated before storage:

- Type checking
- Enum validation
- JSON parsing for objects

## Troubleshooting

### Common Issues

1. **Config service not ready:**
```javascript
// Wait for initialization
while (!window.config?.isInitialized) {
    await new Promise(resolve => setTimeout(resolve, 100));
}
```

2. **Migration not running:**
```javascript
// Force migration
await config.runMigrations();
```

3. **Values not updating:**
```javascript
// Clear cache
config.clearCache();
const freshValue = await config.get('key');
```

### Debug Mode

Enable debug mode for detailed logging:

```javascript
await config.set('debugMode', true);
```

## Best Practices

### 1. Always Use Async/Await

```javascript
// ✅ Good
const value = await config.get('key');

// ❌ Bad (will break)
const value = config.get('key');
```

### 2. Handle Errors

```javascript
try {
    await config.set('key', value);
} catch (error) {
    console.error('Config update failed:', error);
    // Handle error appropriately
}
```

### 3. Use Meaningful Defaults

```javascript
// ✅ Good - provide fallback
const retryCount = await config.get('apiRetryCount', 3);

// ❌ Bad - no fallback
const retryCount = await config.get('apiRetryCount');
```

### 4. Clean Up Listeners

```javascript
// Store unsubscribe functions
const listeners = [];

function setupConfigListeners() {
    listeners.push(config.listen('theme', handleThemeChange));
    listeners.push(config.listen('perfMode', handlePerfChange));
}

function cleanup() {
    listeners.forEach(unsubscribe => unsubscribe());
    listeners.length = 0;
}
```

## Roadmap

### Immediate Benefits
- ✅ Single API for all configuration
- ✅ Automatic migration from existing sources
- ✅ Backward compatibility maintained
- ✅ Type validation and error handling

### Future Enhancements
- 🔄 Remote configuration management
- 🔄 Configuration versioning
- 🔄 A/B testing integration
- 🔄 Real-time configuration updates
- 🔄 Configuration analytics

## Support

For issues or questions:
1. Test with `config-service-demo.html`
2. Check browser console for errors
3. Verify `window.config.isInitialized` is true
4. Review this integration guide

The configuration service is designed to be safe, backward-compatible, and gradually adoptable. Start with new features and migrate existing code at your own pace.