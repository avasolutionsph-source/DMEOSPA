# Fix Login Redirect Issue

## Problem
Users are being redirected to the marketing website after logging in because they're using the marketing website's login page instead of the PWA's built-in authentication modal.

## Root Cause
The marketing website's login page (`/login`) has hardcoded redirect logic:
- Regular users → `/business-dashboard` 
- Super admins → `/admin`

This happens in `marketing-website/public/login.html` lines 135-141.

## Solution

### Option 1: Use PWA's Authentication Modal (Recommended)
Make sure users access the PWA directly and use its built-in auth modal:
1. Access the PWA at: `https://ava-solutions-pwa.netlify.app`
2. The PWA should show its own login modal, not redirect to marketing site
3. After login, users stay in the PWA

### Option 2: Fix Marketing Website Login Redirect
If users must use the marketing website login, update the redirect logic to detect PWA users:

```javascript
// In marketing-website/public/login.html, replace lines 135-141 with:
if (data.user.role === 'superAdmin') {
    window.location.href = '/admin';
} else {
    // Check if user came from PWA
    const referrer = document.referrer;
    if (referrer.includes('ava-solutions-pwa.netlify.app')) {
        // Redirect back to PWA
        window.location.href = 'https://ava-solutions-pwa.netlify.app';
    } else {
        // Stay on marketing site
        window.location.href = '/business-dashboard';
    }
}
```

### Option 3: Separate Auth Flows Completely
1. PWA users should NEVER see marketing website login
2. Ensure PWA auth modal is always used
3. Remove any links from PWA to marketing login page

## Immediate Fix
To prevent the redirect issue immediately:

1. **For PWA Users**: 
   - Always use the PWA URL directly: `https://ava-solutions-pwa.netlify.app`
   - Don't navigate to marketing website login
   - Use the auth modal that appears in the PWA

2. **Update PWA Auth Flow**:
   - Ensure the PWA's auth modal doesn't close and redirect
   - Keep users in the PWA after successful login
   - The auth.js already handles this correctly (lines 174-180)

## Testing
1. Clear browser cache and cookies
2. Go directly to: `https://ava-solutions-pwa.netlify.app`
3. Click login in the PWA (not marketing site)
4. After successful login, you should stay in the PWA

## Long-term Solution
Consider implementing:
- OAuth/SSO for seamless auth between marketing and PWA
- JWT tokens that work across both domains
- Unified auth service that both sites use