# PWA Authentication Configuration

## Issue
The PWA is trying to authenticate against a separate backend, but users are registered in the Marketing Website backend.

## Solution
Use the Marketing Website as an authentication proxy for the PWA.

## PWA Configuration Required

In your PWA's authentication code, change the login endpoint from:
```javascript
// OLD - Don't use this
const response = await fetch('https://ava-pwa-backend.onrender.com/api/auth/login', {
```

To:
```javascript
// NEW - Use this instead
const response = await fetch('https://ava-solutions-marketing.netlify.app/api/pwa-auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: email,
        password: password
    })
});
```

## Benefits
- ✅ Single source of truth for user accounts
- ✅ No need to sync between multiple backends  
- ✅ Users can login to PWA immediately after registering
- ✅ Franchise owner privileges work correctly
- ✅ Simplified architecture

## API Response Format
The new endpoint returns the same format as expected:
```json
{
    "success": true,
    "message": "Login successful", 
    "token": "jwt-token-here",
    "user": {
        "id": "user-id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe", 
        "businessName": "My Spa",
        "role": "owner",
        "businessType": "single_location",
        "isMainOwner": false
    }
}
```

## Implementation Status
- ✅ Marketing Website proxy endpoint created
- ✅ CORS configured to allow PWA access
- ✅ Authentication logic tested
- ⏳ PWA frontend needs to be updated to use new endpoint

## Next Steps
Update the PWA's login JavaScript to use the new endpoint URL above.