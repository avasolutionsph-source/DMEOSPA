# DAETSPA Deployment Guide

## 🚀 Complete Deployment Instructions

### Status:
- ✅ **Backend**: Deployed at `https://daetspa-backend.onrender.com`
- ⏳ **Marketing Website**: Ready to deploy
- ⏳ **PWA**: Ready to deploy

---

## 1. Marketing Website Deployment (Render)

### Step 1: Create New Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `marketing-website` folder as root directory

### Step 2: Configure Build Settings
- **Name**: `daetspa-marketing`
- **Environment**: `Node.js`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: `18.x` or `20.x`

### Step 3: Environment Variables
Set these in Render dashboard:
```env
MARKETING_PORT=3005
MONGODB_URI=mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions
JWT_SECRET=ava-solutions-super-secure-jwt-secret-key-2024-marketing-website-authentication-system
JWT_EXPIRE=999y
ALLOWED_ORIGINS=http://localhost:3003,http://localhost:8080,http://localhost:4001,http://127.0.0.1:5500,https://daetspa-backend.onrender.com
ADMIN_EMAIL=avasolutionsph@gmail.com
ADMIN_PASSWORD=Ava12345
PWA_BACKEND_URL=https://daetspa-backend.onrender.com
NODE_ENV=production

# Optional: OAuth (set if needed)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
FACEBOOK_APP_ID=placeholder-app-id-for-development
FACEBOOK_APP_SECRET=placeholder-app-secret-for-development
```

### Step 4: Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Your marketing site will be available at: `https://your-service-name.onrender.com`

---

## 2. PWA Deployment (Netlify - Recommended for Static Sites)

### Option A: Netlify Deployment (Recommended)

#### Step 1: Prepare PWA for Deployment
- PWA is already configured for production
- No build process needed (vanilla JS/HTML/CSS)

#### Step 2: Deploy to Netlify
1. Go to [Netlify](https://app.netlify.com/)
2. Click "Add new site" → "Deploy manually"
3. Drag and drop the entire `PWA-Repository` folder
4. Or connect via Git:
   - Choose "Import from Git"
   - Select your repository
   - Set publish directory to `PWA-Repository`
   - Leave build command empty (static site)

#### Step 3: Configure Settings
- **Site name**: Choose a custom name like `daetspa-pwa`
- **Branch**: `main`
- **Publish directory**: `/PWA-Repository`
- **Build command**: Leave empty

### Option B: Render Static Site

#### Alternative Deployment Steps:
1. Render Dashboard → "New +" → "Static Site"
2. Connect repository
3. Set:
   - **Name**: `daetspa-pwa`
   - **Root Directory**: `PWA-Repository`
   - **Build Command**: Leave empty
   - **Publish Directory**: `.` (current directory)

---

## 3. Update PWA Configuration for Production

After PWA deployment, update the production URL in API config:

### Update this file: `PWA-Repository/js/api-config.js`

```javascript
// Line 14-16, change production URL to your deployed PWA URL
BASE_URL: isProduction 
    ? 'https://daetspa-backend.onrender.com'  // Backend URL (already correct)
    : 'http://localhost:4001',
```

The `isProduction` check will automatically detect when PWA is accessed from the deployed URL (not localhost).

---

## 4. Testing Deployments

### Test Backend (Already Working ✅)
```bash
curl https://daetspa-backend.onrender.com/health
```

### Test Marketing Website (After Deployment)
```bash
curl https://your-marketing-site.onrender.com
```

### Test PWA (After Deployment)
1. Open PWA URL in browser
2. Check browser console for API calls
3. Try logging in/registering
4. Test POS functionality
5. Verify offline functionality

---

## 5. DNS & Custom Domain (Optional)

### For Custom Domain:
1. **Render**: Go to Settings → Custom Domains
2. **Netlify**: Go to Domain Management → Add custom domain
3. Update DNS records:
   - Marketing: `marketing.yourdomain.com` → Marketing site
   - App: `app.yourdomain.com` → PWA
   - API: `api.yourdomain.com` → Backend

---

## 6. Environment Variables Summary

### Backend (Already Set ✅)
- JWT_SECRET
- MONGODB_URI
- NODE_ENV=production
- PORT=4001

### Marketing Website
- MARKETING_PORT=3005
- MONGODB_URI (same as backend)
- JWT_SECRET (same as backend)
- PWA_BACKEND_URL=https://daetspa-backend.onrender.com
- ADMIN_EMAIL & ADMIN_PASSWORD

### PWA
- No server-side environment variables needed
- Configuration handled in `js/api-config.js`

---

## 7. Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Marketing website loads correctly
- [ ] PWA loads and shows login screen
- [ ] User registration works
- [ ] User login works
- [ ] POS system functions properly
- [ ] Data syncs between PWA and backend
- [ ] Offline functionality works
- [ ] Admin panel accessible via marketing site

---

## 8. Troubleshooting

### Common Issues:

1. **CORS Errors**: Update ALLOWED_ORIGINS in marketing website .env
2. **API Connection Failed**: Check backend URL in PWA api-config.js
3. **Authentication Issues**: Verify JWT_SECRET matches between services
4. **Database Connection**: Ensure MONGODB_URI is correctly set

### Debug URLs:
- Backend Health: `https://daetspa-backend.onrender.com/health`
- Backend API: `https://daetspa-backend.onrender.com/api/`
- Marketing API: `https://your-marketing-site.onrender.com/api/`

---

## 9. Scaling Considerations

### For Production Scale:
1. **Database**: Consider MongoDB Atlas dedicated cluster
2. **CDN**: Use Cloudflare for static assets
3. **Monitoring**: Set up uptime monitoring
4. **Backup**: Implement automated database backups
5. **SSL**: Render/Netlify provide SSL automatically

---

Your system is now ready for deployment! 🎉