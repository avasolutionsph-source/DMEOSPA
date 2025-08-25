# Separate Repository Setup Instructions

## 🎯 Overview
You'll create 2 separate GitHub repositories:
1. **PWA Repository** → Deploy to `ava-solutions-pwa.netlify.app`
2. **Marketing Repository** → Deploy to `ava-solutions-marketing.netlify.app`

## 📱 PWA Repository Setup

### Step 1: Create New GitHub Repository
1. Go to GitHub and create new repository: `AvasolutionsPH-PWA`
2. Make it public or private (your choice)
3. Don't initialize with README (we'll add files)

### Step 2: Copy PWA Files
Create a new folder and copy these files from current repository:

```
PWA-Repository/
├── index.html
├── login.html
├── register.html
├── manifest.json
├── service-worker.js
├── styles.css
├── updates.json
├── netlify.toml (rename netlify.toml.pwa to netlify.toml)
├── _headers
├── js/ (entire directory)
└── icons/ (entire directory)
```

### Step 3: Initialize Git
```bash
cd PWA-Repository
git init
git add .
git commit -m "Initial PWA repository setup"
git remote add origin https://github.com/YOUR-USERNAME/AvasolutionsPH-PWA.git
git push -u origin main
```

## 🌐 Marketing Website Repository Setup  

### Step 1: Create New GitHub Repository
1. Go to GitHub and create new repository: `AvasolutionsPH-Marketing`
2. Make it public or private (your choice)

### Step 2: Copy Marketing Files
Create a new folder and restructure files:

```
Marketing-Repository/
├── index.html (from marketing-website/public/index.html)
├── admin.html (from marketing-website/public/admin.html)
├── login.html (from marketing-website/public/login.html)
├── register.html (from marketing-website/public/register.html)
├── pricing.html (from marketing-website/public/pricing.html)
├── contact.html (from marketing-website/public/contact.html)
├── business-dashboard.html (from marketing-website/public/business-dashboard.html)
├── netlify.toml (rename netlify.toml.marketing to netlify.toml)
├── assets/
│   ├── admin.js (from marketing-website/public/assets/admin.js)
│   ├── main.js (from marketing-website/public/assets/main.js)
│   ├── style.css (from marketing-website/public/assets/style.css)
│   └── favicon.svg (from marketing-website/public/assets/favicon.svg)
└── [other marketing files]
```

### Step 3: Initialize Git
```bash
cd Marketing-Repository
git init
git add .
git commit -m "Initial marketing website repository setup"
git remote add origin https://github.com/YOUR-USERNAME/AvasolutionsPH-Marketing.git
git push -u origin main
```

## ⚙️ Netlify Deployment Setup

### PWA Site
1. Go to Netlify Dashboard
2. "New site from Git" → Connect your PWA repository
3. Settings should auto-detect from netlify.toml:
   - Base directory: (empty)
   - Build command: (auto-detected)
   - Publish directory: (auto-detected)
4. Deploy!

### Marketing Site  
1. Go to Netlify Dashboard
2. "New site from Git" → Connect your Marketing repository
3. Settings should auto-detect from netlify.toml:
   - Base directory: (empty)
   - Build command: (auto-detected)  
   - Publish directory: (auto-detected)
4. Deploy!

## 🔗 Update API URLs

After deployment, you'll need to update API URLs in both sites to point to your backend:

**In PWA files (js/api-config.js):**
```javascript
const API_BASE_URL = 'https://ava-pwa-backend.onrender.com';
```

**In Marketing files (assets/admin.js, assets/main.js):**
```javascript
const API_BASE_URL = 'https://ava-pwa-backend.onrender.com';
```

## 🎉 Result
- **PWA**: `https://ava-solutions-pwa.netlify.app`
- **Marketing**: `https://ava-solutions-marketing.netlify.app`  
- **Backend**: `https://ava-pwa-backend.onrender.com` (unchanged)

Both will deploy independently without conflicts!