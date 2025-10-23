# Hero Banner Branding Feature

## Overview

The marketing website now supports **dynamic, customizable hero banners** with a Facebook cover photo style interface. Admins can choose from pre-designed templates or upload custom images, making it easy to visually customize their spa's website.

## Key Features

### 1. Pre-Made Templates (5 Generic Spa Designs)
- **Template 1: Zen Stones** - Purple gradient with floating elements
- **Template 2: Lotus Flower** - Pink/purple spa vibes
- **Template 3: Tropical Leaves** - Green/teal natural theme
- **Template 4: Hot Stones** - Warm orange/brown therapy theme
- **Template 5: Ocean Waves** - Blue/aqua serenity theme

### 2. Custom Image Upload
- Upload your own hero banner image
- Recommended size: **1920x1080px** (Facebook cover photo dimensions)
- Supported formats: JPEG, PNG, GIF, WebP
- Maximum file size: 5MB
- Images stored in `/backend/public/uploads/branding/`

### 3. Customizable Elements
- **Hero Title** - Business-specific title (e.g., "ABC Massage & Spa")
- **Hero Subtitle** - Tagline (e.g., "Where tranquility meets expertise")
- **CTA Button Text** - Customizable call-to-action (default: "Book Now")
- **CTA Button Link** - Where the button leads (default: "/book-appointment")
- **Brand Colors** - Primary and accent colors for consistent branding

### 4. Live Preview
- Real-time preview of hero banner changes
- See exactly how it looks before saving
- Updates dynamically as you edit

## How to Use

### For Admins:

1. **Login to Admin Dashboard**
   - Go to `/admin-login.html`
   - Enter your admin credentials

2. **Access Branding Panel**
   - Click the **"Website Branding"** button in the header
   - Or navigate to `/admin-branding.html`

3. **Choose a Template**
   - Click on any of the 5 pre-designed templates
   - OR click "Custom Upload" to use your own image

4. **Upload Custom Image (Optional)**
   - Click the upload area or drag & drop your image
   - Preview appears immediately
   - Click "Upload Image" to save

5. **Customize Text**
   - Edit hero title, subtitle, and button text
   - Changes reflect in live preview

6. **Save Changes**
   - Click "Save All Changes"
   - Your website homepage updates immediately

### For Customers:

- Homepage automatically loads the customized branding
- No action needed - they see your customized design

## Technical Implementation

### Backend Components

**API Endpoints:**
```
GET    /api/branding/:userId        - Get branding settings
PUT    /api/branding/:userId        - Update branding settings
POST   /api/branding/:userId/upload-hero  - Upload hero image
POST   /api/branding/:userId/upload-logo  - Upload logo image
DELETE /api/branding/:userId/hero-image   - Delete custom hero image
```

**Database Schema:**
```javascript
branding: {
  heroImageUrl: String,
  heroTemplate: String,  // 'template1' | 'template2' | ... | 'custom'
  heroTitle: String,
  heroSubtitle: String,
  ctaButtonText: String,
  ctaButtonLink: String,
  logoUrl: String,
  primaryColor: String,
  accentColor: String,
  showHeroBanner: Boolean,
  lastUpdated: Date
}
```

**Files:**
- `/backend/models/User.js` - User schema with branding fields
- `/backend/routes/api/branding.js` - Branding API routes
- `/backend/middleware/upload.js` - Multer image upload configuration

### Frontend Components

**Admin Panel:**
- `/marketing-website/public/admin-branding.html` - Branding customization UI
- `/marketing-website/public/assets/admin-branding.js` - Branding panel logic
- `/marketing-website/public/assets/hero-templates.css` - Template styles

**Homepage Integration:**
- `/marketing-website/public/index.html` - Dynamic hero section
- `/marketing-website/public/assets/main.js` - Dynamic branding loader

### CSS Classes

**Template Classes:**
- `.hero-template1` - Zen Stones template
- `.hero-template2` - Lotus Flower template
- `.hero-template3` - Tropical Leaves template
- `.hero-template4` - Hot Stones template
- `.hero-template5` - Ocean Waves template
- `.hero-custom` - Custom uploaded image

## File Structure

```
DAETSPASPA - Copy/
├── backend/
│   ├── models/User.js                    # Updated with branding fields
│   ├── routes/api/branding.js            # NEW: Branding API routes
│   ├── middleware/upload.js              # NEW: Image upload middleware
│   ├── public/uploads/branding/          # NEW: Uploaded images directory
│   └── server.js                         # Updated with branding routes
│
└── marketing-website/public/
    ├── admin-branding.html               # NEW: Branding admin panel
    ├── admin-dashboard.html              # Updated: Added branding button
    ├── index.html                        # Updated: Dynamic hero section
    └── assets/
        ├── admin-branding.js             # NEW: Branding panel JavaScript
        ├── hero-templates.css            # NEW: Template styles
        └── main.js                       # Updated: Dynamic branding loader
```

## Design Rationale

### Why Facebook Cover Photo Style?

1. **Familiar UX** - Most spa owners understand FB cover photos
2. **Visual First** - Clients see design before functionality
3. **Easy to Edit** - Simple drag & drop interface
4. **Templates Included** - No design skills required
5. **Generic Designs** - Templates work for any spa/massage business

### Why "Book Now" Button Stays Fixed?

- The CTA is the most important conversion element
- While text can be customized, the button always remains visible
- Ensures consistent user journey across all templates

## Security Considerations

- **Authentication Required** - Only authenticated admins can upload/edit
- **File Validation** - Only image files allowed (JPEG, PNG, GIF, WebP)
- **File Size Limit** - 5MB maximum to prevent abuse
- **Unique Filenames** - Prevents file overwrites
- **Authorization Check** - Users can only edit their own branding
- **Super Admin Override** - Super admins can edit any business branding

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ⚠️ IE11 not supported (uses modern CSS gradients and ES6)

## Performance

- **Image Optimization** - Recommend using compressed images
- **CDN Ready** - Uploaded images can be served via CDN
- **Lazy Loading** - Hero loads progressively
- **Caching** - Templates cached in CSS
- **Minimal API Calls** - Only loads branding once per session

## Troubleshooting

### Hero not updating after save?
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Check if backend is running

### Image upload failing?
- Check file size (must be under 5MB)
- Verify file format (JPEG, PNG, GIF, WebP only)
- Ensure backend `/uploads` directory exists
- Check server logs for errors

### Template not displaying correctly?
- Verify hero-templates.css is loaded
- Check browser console for CSS errors
- Ensure template class is applied to hero section

## Future Enhancements

Potential features to add:
- [ ] Logo upload and positioning
- [ ] Video background support
- [ ] Parallax scrolling effects
- [ ] Multiple hero slides/carousel
- [ ] Mobile-specific hero images
- [ ] Template marketplace
- [ ] AI-powered template suggestions
- [ ] Image editing tools (crop, filter, brightness)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify backend server is running
3. Check MongoDB connection
4. Review server logs in `/backend/logs/`
5. Create issue on GitHub repository

---

**Last Updated:** September 2025
**Version:** 1.0.0
**Author:** ABC Spa Development Team
