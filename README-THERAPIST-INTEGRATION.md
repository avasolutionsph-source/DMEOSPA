# Therapist Portal Integration

This document explains the direct connection between the PWA therapist account and the booking website.

## Overview

The therapist integration provides a seamless connection between the main Ava Solutions PWA and a dedicated therapist portal in the booking website. This reduces errors and provides a specialized interface for therapists.

## Components

### 1. PWA Integration (`js/therapist-portal.js`)
- **TherapistPortalManager**: Manages the connection between PWA and booking portal
- **Auto-detection**: Automatically shows therapist portal nav for therapist accounts
- **Smart URL generation**: Creates authenticated portal URLs with therapist data
- **Cross-platform support**: Handles mobile and desktop differently

### 2. Booking Website Portal (`booking-website/therapist.html`)
- **Dedicated interface**: Mobile-optimized design for therapists
- **Real-time data**: Syncs with main system for bookings and schedules
- **Service timer**: Built-in timer with completion alerts
- **Quick actions**: Start services, view schedules, manage appointments

### 3. Authentication Flow
```
PWA (Therapist Login) → Portal URL with token → Booking Website (Auto-login) → Therapist Dashboard
```

## Features

### For Therapists:
- ✅ **Direct Portal Access**: One-click launch from PWA dashboard
- ✅ **Mobile Optimized**: Perfect for phones and tablets during work
- ✅ **Service Timer**: Track appointment duration with alerts
- ✅ **Today's Schedule**: See all appointments at a glance
- ✅ **Quick Actions**: Start/complete services directly from schedule
- ✅ **Offline Support**: Works without internet, syncs when connected

### For Administrators:
- ✅ **Seamless Integration**: No separate login required
- ✅ **Real-time Sync**: Updates reflect instantly across systems
- ✅ **Secure Authentication**: Token-based authentication with automatic expiry
- ✅ **Error Reduction**: Dedicated interface reduces common mistakes

## Usage

### From PWA:
1. Login as a therapist account
2. Navigate to "Therapist Portal" (automatically visible for therapists)
3. Click "Launch Portal" to open the dedicated interface

### Direct Access:
1. Bookmark the portal URL for quick access: `/booking-website/therapist.html`
2. Login using your therapist credentials
3. All your appointments and data will load automatically

## Technical Details

### URL Parameters:
- `token`: Authentication token from main PWA
- `therapistId`: Unique therapist identifier
- `name`: Therapist display name
- `email`: Therapist email address

### Data Sync:
- Bookings are filtered by therapist ID/name/email
- Real-time updates using the marketing API
- Fallback to demo data for testing/offline mode

### Mobile Considerations:
- Touch-optimized interface
- Bottom navigation for easy thumb access
- Large buttons for quick actions
- Swipe gestures support (future enhancement)

## Error Handling

### Connection Issues:
- Auto-retry for failed API calls
- Graceful fallback to cached data
- Clear error messages with recovery options

### Authentication Problems:
- Automatic token refresh
- Redirect to login when session expires
- Clear instructions for manual login

## Future Enhancements

1. **Push Notifications**: Alert therapists of new/changed appointments
2. **Offline Sync**: Full offline capability with background sync
3. **Voice Commands**: Start/stop timers using voice
4. **Smart Alerts**: Predictive notifications based on schedule patterns
5. **Integration APIs**: Connect with third-party spa management systems

## Troubleshooting

### Portal won't open:
1. Check if popup blockers are enabled
2. Verify therapist role is properly assigned
3. Clear browser cache and try again

### Data not loading:
1. Check internet connection
2. Verify authentication token is valid
3. Try refreshing the portal page

### Mobile issues:
1. Ensure you're using a supported browser (Chrome, Safari, Firefox)
2. Check that JavaScript is enabled
3. Clear browser data if needed

## Support

For technical issues or feature requests related to the therapist portal integration, please:

1. Check this documentation first
2. Review browser console for error messages  
3. Contact the development team with specific error details
4. Include device type, browser version, and steps to reproduce

---

*Last updated: December 2024*
