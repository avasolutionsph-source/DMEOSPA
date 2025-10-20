# ABC Spa - Quick Deployment Checklist

## ⚡ Fast Track (30 Minutes Total)

### Phase 1: MongoDB Atlas (5 minutes)
- [ ] Sign up: https://www.mongodb.com/cloud/atlas/register
- [ ] Create FREE cluster (M0)
- [ ] Create database user (username + password)
- [ ] Whitelist all IPs (0.0.0.0/0)
- [ ] Copy connection string
- [ ] **SAVE:** `mongodb+srv://user:password@cluster.mongodb.net/abc-spa-production`

### Phase 2: GitHub (5 minutes)
```bash
cd "C:\Users\opet_\OneDrive\Desktop\DAETSPASPA - Copy"
git init
git add .
git commit -m "ABC Spa - Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/abc-massage-spa.git
git push -u origin main
```
- [ ] Create repo: https://github.com/new
- [ ] Push code to GitHub

### Phase 3: Render Backend (10 minutes)
1. [ ] Sign up: https://render.com (use GitHub)
2. [ ] New Web Service → Connect repo
3. [ ] Settings:
   - Name: `abc-spa-backend`
   - Root: `backend`
   - Build: `npm install`
   - Start: `npm start`
4. [ ] Add env vars:
   ```
   NODE_ENV=production
   PORT=4001
   MONGODB_URI=<your-atlas-connection-string>
   JWT_SECRET=<generate-random-32-chars>
   SESSION_SECRET=<generate-random-32-chars>
   JWT_EXPIRES_IN=7d
   ```
5. [ ] Deploy
6. [ ] **SAVE URL:** `https://abc-spa-backend.onrender.com`

### Phase 4: Netlify PWA (5 minutes)
1. [ ] Sign up: https://app.netlify.com (use GitHub)
2. [ ] New site → Import from GitHub
3. [ ] Settings:
   - Base: `PWA-Repository`
   - Publish: `.`
4. [ ] Deploy
5. [ ] **SAVE URL:** `https://abc-spa-pwa.netlify.app`

### Phase 5: Netlify Marketing (5 minutes)
1. [ ] New site → Import from GitHub (same repo)
2. [ ] Settings:
   - Base: `marketing-website`
   - Publish: `public`
3. [ ] Deploy
4. [ ] **SAVE URL:** `https://abc-massage-spa.netlify.app`

### Phase 6: Final Configuration (5 minutes)

1. **Update PWA API Config**
   - Edit on GitHub: `PWA-Repository/js/api-config.js`
   - Line 15: `BASE_URL: 'https://YOUR-RENDER-URL.onrender.com'`
   - Line 20: `WS_URL: 'wss://YOUR-RENDER-URL.onrender.com'`
   - Commit → Auto-redeploys

2. **Update Backend CORS**
   - Render dashboard → Environment
   - `ALLOWED_ORIGINS`: `https://your-pwa.netlify.app,https://your-marketing.netlify.app`
   - Save → Auto-redeploys

---

## 🎯 Quick Test

1. Visit Marketing: `https://abc-massage-spa.netlify.app`
2. Visit PWA: `https://abc-spa-pwa.netlify.app`
3. Register account
4. Login
5. Check dashboard loads

---

## 📝 Your Deployment URLs

Fill these in:

```
Backend:   https://_____________________.onrender.com
PWA:       https://_____________________.netlify.app
Marketing: https://_____________________.netlify.app
MongoDB:   mongodb+srv://_____________________________
```

---

## ⚠️ Common Issues

**Backend sleeping (30s delay)**: Normal on free tier - first request is slow

**CORS error**: Check ALLOWED_ORIGINS matches your Netlify URLs exactly

**MongoDB connection failed**: Verify connection string and IP whitelist

**404 errors**: Check base directory and publish directory settings

---

## ✅ Done!

All 3 services deployed and connected. Changes auto-deploy when you push to GitHub.

**See DEPLOYMENT-GUIDE.md for detailed troubleshooting.**
