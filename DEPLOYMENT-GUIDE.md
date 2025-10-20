# ABC Massage and Spa - Complete Deployment Guide

This guide will walk you through deploying your ABC Spa system across **3 separate platforms**:
- **Backend API** → Render.com (Free tier)
- **PWA Application** → Netlify (Free tier)
- **Marketing Website** → Netlify (Free tier)

---

## 📋 Pre-Deployment Checklist

### 1. MongoDB Atlas Setup (Required First!)

**Why:** Your local MongoDB won't work in production. You need a cloud database.

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free (no credit card required)

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose **FREE** (M0 Sandbox)
   - Select region closest to you (e.g., AWS Oregon)
   - Cluster name: `abc-spa-cluster`
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" → "Add New Database User"
   - Username: `abc-spa-admin`
   - Password: Generate a strong password (SAVE THIS!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Whitelist IP Addresses**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm

5. **Get Connection String**
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://abc-spa-admin:<password>@abc-spa-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Add database name at the end: `...mongodb.net/abc-spa-production?retryWrites=true&w=majority`

**Final MongoDB URI Example:**
```
mongodb+srv://abc-spa-admin:YourPassword123@abc-spa-cluster.xxxxx.mongodb.net/abc-spa-production?retryWrites=true&w=majority
```

**SAVE THIS CONNECTION STRING - YOU'LL NEED IT!**

---

## 🚀 Deployment Steps

### Step 1: Create GitHub Repository

1. **Create a new repository on GitHub**
   - Go to: https://github.com/new
   - Repository name: `abc-massage-spa`
   - Description: "ABC Massage and Spa - Complete Management System"
   - **Public** or **Private** (your choice)
   - **DO NOT** initialize with README (we already have one)
   - Click "Create repository"

2. **Connect your local repository to GitHub**
   ```bash
   # In your project root directory
   git init
   git add .
   git commit -m "Initial commit - ABC Spa deployment ready"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/abc-massage-spa.git
   git push -u origin main
   ```

   Replace `YOUR-USERNAME` with your GitHub username.

---

### Step 2: Deploy Backend to Render

**URL:** https://render.com

1. **Sign up for Render**
   - Go to: https://render.com
   - Click "Get Started for Free"
   - Sign up with GitHub (recommended)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `abc-massage-spa` repository

3. **Configure Backend Service**
   - **Name:** `abc-spa-backend`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. **Add Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add these:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4001` |
   | `MONGODB_URI` | `mongodb+srv://abc-spa-admin:YourPassword@...` (from Step 1) |
   | `JWT_SECRET` | Generate random string (32+ characters) |
   | `SESSION_SECRET` | Generate random string (32+ characters) |
   | `ALLOWED_ORIGINS` | Leave blank for now (will update after PWA/Marketing deploy) |
   | `JWT_EXPIRES_IN` | `7d` |

   **To generate secrets:**
   - Open browser console and run: `crypto.randomUUID()`
   - Or use: https://www.uuidgenerator.net/

5. **Deploy**
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment
   - Copy your backend URL (e.g., `https://abc-spa-backend.onrender.com`)

**SAVE YOUR BACKEND URL - YOU'LL NEED IT!**

---

### Step 3: Deploy PWA to Netlify

**URL:** https://www.netlify.com

1. **Sign up for Netlify**
   - Go to: https://app.netlify.com/signup
   - Sign up with GitHub (recommended)

2. **Create New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your `abc-massage-spa` repository

3. **Configure PWA Deployment**
   - **Site name:** `abc-spa-pwa` (or choose your own)
   - **Branch:** `main`
   - **Base directory:** `PWA-Repository`
   - **Build command:** Leave empty
   - **Publish directory:** `.` (just a dot)

4. **Deploy**
   - Click "Deploy site"
   - Wait 1-2 minutes
   - Copy your PWA URL (e.g., `https://abc-spa-pwa.netlify.app`)

5. **Update API Configuration**
   - Go to your repository on GitHub
   - Navigate to: `PWA-Repository/js/api-config.js`
   - Click "Edit" (pencil icon)
   - Line 15: Replace with your backend URL:
     ```javascript
     BASE_URL: isProduction
         ? 'https://abc-spa-backend.onrender.com' // Your Render backend URL
         : 'http://localhost:4001',
     ```
   - Line 20: Update WebSocket URL:
     ```javascript
     WS_URL: isProduction
         ? 'wss://abc-spa-backend.onrender.com' // Your Render backend URL
         : 'ws://localhost:4001',
     ```
   - Commit changes
   - Netlify will auto-redeploy in ~1 minute

**SAVE YOUR PWA URL!**

---

### Step 4: Deploy Marketing Website to Netlify

1. **Create Another Site on Netlify**
   - Go to Netlify dashboard
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your `abc-massage-spa` repository (same repo, different folder)

2. **Configure Marketing Website Deployment**
   - **Site name:** `abc-massage-spa` (or choose your own)
   - **Branch:** `main`
   - **Base directory:** `marketing-website`
   - **Build command:** Leave empty
   - **Publish directory:** `public`

3. **Deploy**
   - Click "Deploy site"
   - Wait 1-2 minutes
   - Copy your Marketing URL (e.g., `https://abc-massage-spa.netlify.app`)

**SAVE YOUR MARKETING URL!**

---

### Step 5: Update CORS Settings

Now that all 3 services are deployed, update the backend to allow requests from PWA and Marketing sites.

1. **Go to Render Dashboard**
   - Open your `abc-spa-backend` service
   - Click "Environment" tab
   - Find `ALLOWED_ORIGINS` variable
   - Update value to:
     ```
     https://abc-spa-pwa.netlify.app,https://abc-massage-spa.netlify.app
     ```
     (Replace with your actual Netlify URLs, comma-separated, no spaces)

2. **Save and Redeploy**
   - Click "Save Changes"
   - Render will auto-redeploy (~2 minutes)

---

## 🎉 Post-Deployment Testing

### Test Your Deployed System

1. **Test Marketing Website**
   - Visit: `https://abc-massage-spa.netlify.app`
   - Check all pages load (Home, About, Services, Contact)
   - Test navigation

2. **Test PWA Application**
   - Visit: `https://abc-spa-pwa.netlify.app`
   - Register a new account
   - Login
   - Test dashboard loads
   - Check if offline mode works (DevTools → Network → Offline)

3. **Test Backend Connection**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Login to PWA
   - Look for successful API calls (should see green 200 status codes)
   - Check Network tab for requests to your Render backend

---

## 📝 Important URLs Summary

After deployment, you'll have these 3 URLs:

| Service | URL | Purpose |
|---------|-----|---------|
| **Backend API** | `https://abc-spa-backend.onrender.com` | API server |
| **PWA App** | `https://abc-spa-pwa.netlify.app` | Business management |
| **Marketing Site** | `https://abc-massage-spa.netlify.app` | Public website |

**Write these down!**

---

## 🔧 Troubleshooting

### Issue: PWA can't connect to backend

**Solution:**
1. Check `api-config.js` has correct backend URL
2. Verify CORS settings on Render include your PWA URL
3. Check browser console for errors
4. Render free tier has 30-60 second cold start - wait and retry

### Issue: Backend shows "Cannot connect to MongoDB"

**Solution:**
1. Verify MongoDB Atlas connection string is correct
2. Check password doesn't have special characters (if so, URL encode it)
3. Verify IP whitelist includes 0.0.0.0/0
4. Test connection string locally first

### Issue: "404 Not Found" on Marketing Website

**Solution:**
1. Verify `netlify.toml` exists in `marketing-website/` folder
2. Check "Publish directory" is set to `public`
3. Redeploy from Netlify dashboard

### Issue: Render deployment failed

**Solution:**
1. Check "Deploy logs" on Render dashboard
2. Verify `package.json` has correct Node version (18+)
3. Ensure all dependencies install correctly
4. Check environment variables are set

### Issue: Changes not showing after push to GitHub

**Solution:**
1. Check Netlify "Deploys" tab - should show new deployment
2. Wait 1-2 minutes for build to complete
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Clear browser cache

---

## 🔐 Security Checklist

After deployment:

- [ ] Changed all default passwords
- [ ] Used strong JWT_SECRET (32+ random characters)
- [ ] MongoDB user has strong password
- [ ] CORS only allows your domains (not *)
- [ ] Environment variables are set on Render (not in code)
- [ ] `.env` files are in `.gitignore` (never committed)

---

## 💰 Cost Breakdown

All services used are **100% FREE** with these limitations:

| Service | Free Tier Limits |
|---------|-----------------|
| **Render** | 750 hours/month, sleeps after 15min inactivity, 30-60s cold start |
| **Netlify PWA** | 100GB bandwidth/month, 300 build minutes/month |
| **Netlify Marketing** | 100GB bandwidth/month, 300 build minutes/month |
| **MongoDB Atlas** | 512MB storage, shared RAM, 1 cluster |

**For production business use, consider upgrading:**
- Render: $7/month (no sleep, faster)
- MongoDB Atlas: $9/month (2GB RAM, better performance)
- Netlify: $19/month (more bandwidth)

---

## 🔄 Continuous Deployment

**Automatic deployments are now enabled!**

Whenever you push code to GitHub:
- **Backend** → Render auto-deploys from `backend/` folder
- **PWA** → Netlify auto-deploys from `PWA-Repository/` folder
- **Marketing** → Netlify auto-deploys from `marketing-website/public/` folder

To deploy changes:
```bash
git add .
git commit -m "Your change description"
git push origin main
```

Wait 2-3 minutes and changes will be live!

---

## 🆘 Need Help?

Common issues and solutions:

1. **Render service sleeping**: First request takes 30-60s (normal on free tier)
2. **MongoDB connection timeout**: Check Atlas IP whitelist and connection string
3. **CORS errors**: Verify ALLOWED_ORIGINS on Render matches your Netlify URLs
4. **404 errors**: Check base directory and publish directory settings
5. **Build failures**: Check deployment logs for specific error messages

---

## ✅ Deployment Complete!

You now have a fully deployed, production-ready spa management system!

**Next steps:**
1. Test all features thoroughly
2. Create your first real business account
3. Add employees, products, and services
4. Share the marketing URL with customers
5. Use the PWA URL for daily operations

**Good luck with ABC Massage and Spa! 🎉**
