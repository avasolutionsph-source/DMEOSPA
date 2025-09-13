# 🚀 FREE Deployment Guide - DAET SPA

## **Quick Overview**
Deploy your entire system in 4 steps, completely FREE:

1. **Database**: MongoDB Atlas (FREE 512MB)  
2. **Backend**: Render.com (FREE with sleep)
3. **Marketing**: Netlify (FREE 100GB bandwidth)
4. **PWA**: GitHub Pages (FREE 1GB storage)

---

## **Step 1: MongoDB Atlas Setup** ⏱️ 2 minutes

1. Go to **https://cloud.mongodb.com**
2. Click **"Try Free"** → Sign up with GitHub
3. **Create Cluster**:
   - Choose **"M0 Sandbox"** (FREE forever)
   - Select region closest to you
   - Cluster name: `daetspa-db`
4. **Security Setup**:
   - **Database Access** → Add User → Username: `admin`, Password: (generate strong one - SAVE IT!)
   - **Network Access** → Add IP → **0.0.0.0/0** (allow all)
5. **Get Connection String**:
   - Click **"Connect"** → **"Connect your application"** 
   - Copy the string → Replace `<password>` with your password

**Save this MongoDB URI:**
```
mongodb+srv://admin:YOURPASSWORD@daetspa-db.xxxxx.mongodb.net/ava-marketing-website
```

---

## **Step 2: Backend on Render** ⏱️ 3 minutes

1. Go to **https://render.com** → Sign up with GitHub
2. Click **"New"** → **"Web Service"** → Connect GitHub → Select your repo
3. **Configure**:
   - **Name**: `daetspa-backend`
   - **Root Directory**: `backend` 
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Environment Variables**:
   ```
   NODE_ENV=production
   MONGODB_URI=your-mongodb-uri-from-step1
   JWT_SECRET=make-up-a-long-random-string-here
   PORT=4001
   ```
5. Click **"Create Web Service"**

**Your backend will be**: `https://daetspa-backend.onrender.com`

---

## **Step 3: Marketing Site on Netlify** ⏱️ 2 minutes  

1. Go to **https://netlify.com** → Sign up with GitHub
2. **"Add new site"** → **"Import from Git"** → Choose your repo
3. **Configure**:
   - **Base directory**: `marketing-website`
   - **Build command**: (leave empty)
   - **Publish directory**: `public`
4. **Deploy site** → After deploy, go to **Site Settings** → **Environment Variables**:
   ```
   MONGODB_URI=your-mongodb-uri-from-step1  
   JWT_SECRET=same-as-backend
   BACKEND_API_URL=https://daetspa-backend.onrender.com
   ```

**Your marketing site**: `https://random-name-123456.netlify.app`

---

## **Step 4: PWA on GitHub Pages** ⏱️ 1 minute

1. In your GitHub repo → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` → **Folder**: `/PWA-Repository` → **Save**

**Your PWA**: `https://yourusername.github.io/DAETSPA/`

---

## **Step 5: Update API URLs** ⏱️ 1 minute

Update your frontend to use production URLs: