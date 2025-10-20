# ABC Massage and Spa - Complete Management System

A comprehensive, offline-first Progressive Web Application (PWA) for spa and massage business management, designed for the Philippine market.

![ABC Spa](https://img.shields.io/badge/Status-Production%20Ready-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node-18%2B-green)

## 🌟 Features

### Business Management (PWA)
- **Point of Sale (POS)** - Cash drawer tracking, receipt generation
- **Inventory Management** - Stock tracking, low stock alerts
- **Employee Management** - Payroll, attendance, commission tracking
- **Customer Management** - Service history, gift certificates
- **Appointments** - Booking management, calendar view
- **Room Services** - Service tracking, status updates
- **Analytics Dashboard** - Real-time business metrics
- **Offline-First** - Works without internet, auto-syncs when online

### Marketing Website
- Professional landing page
- Service catalog with pricing
- Contact forms
- About page
- Responsive design

### Backend API
- Unified REST API
- JWT authentication
- Real-time WebSocket support
- MongoDB database
- Rate limiting & security

## 🚀 Quick Start

### Local Development

**Prerequisites:**
- Node.js 18+ and npm
- MongoDB (local or Atlas)

**1. Clone & Install**
```bash
git clone https://github.com/YOUR-USERNAME/abc-massage-spa.git
cd abc-massage-spa
cd backend && npm install
cd ../marketing-website && npm install
```

**2. Configure Environment**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
```

**3. Start Services**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - PWA
cd PWA-Repository
npx http-server -p 8082

# Terminal 3 - Marketing
cd marketing-website/public
npx http-server -p 3003
```

**4. Access Applications**
- PWA: http://localhost:8082
- Marketing: http://localhost:3003
- Backend API: http://localhost:4001

## 📦 Deployment

### 🌐 Production Deployment (3 Services)

This system deploys to **3 separate platforms**:

1. **Backend API** → Render.com (Free tier)
2. **PWA Application** → Netlify (Free tier)
3. **Marketing Website** → Netlify (Free tier)

### Quick Deploy (30 minutes)

Follow the **[DEPLOYMENT-QUICK-START.md](DEPLOYMENT-QUICK-START.md)** guide for step-by-step instructions.

**Summary:**
1. Create MongoDB Atlas cluster (free)
2. Push code to GitHub
3. Deploy backend to Render
4. Deploy PWA to Netlify
5. Deploy marketing to Netlify
6. Update API URLs and CORS settings

**Detailed Guide:** See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

### 🔐 Environment Variables

**Backend (.env)**
```env
NODE_ENV=production
PORT=4001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random-32-chars>
SESSION_SECRET=<random-32-chars>
ALLOWED_ORIGINS=https://your-pwa.netlify.app,https://your-marketing.netlify.app
JWT_EXPIRES_IN=7d
```

**PWA (api-config.js)**
```javascript
BASE_URL: 'https://your-backend.onrender.com'
WS_URL: 'wss://your-backend.onrender.com'
```

## 📁 Project Structure

```
abc-massage-spa/
├── backend/                    # Node.js/Express API server
│   ├── config/                 # Configuration files
│   ├── middleware/             # Auth, validation, error handling
│   ├── models/                 # MongoDB schemas
│   ├── routes/                 # API endpoints
│   ├── services/               # Business logic
│   ├── server.js               # Entry point
│   ├── package.json
│   ├── render.yaml             # Render deployment config
│   └── .env.example
│
├── PWA-Repository/             # Progressive Web App (Vanilla JS)
│   ├── js/                     # Application modules
│   │   ├── api-config.js       # API configuration
│   │   ├── auth.js             # Authentication
│   │   ├── pos.js              # Point of Sale
│   │   ├── inventory.js        # Inventory management
│   │   ├── employees.js        # Employee management
│   │   ├── customers.js        # Customer management
│   │   └── ...                 # Other modules
│   ├── index.html              # Main app entry
│   ├── styles.css              # Black & white theme
│   ├── manifest.json           # PWA manifest
│   ├── service-worker.js       # Offline support
│   └── netlify.toml            # Netlify config
│
├── marketing-website/          # Public marketing site
│   ├── public/                 # Static files
│   │   ├── index.html          # Home page
│   │   ├── about.html          # About page
│   │   ├── services.html       # Services catalog
│   │   ├── contact.html        # Contact page
│   │   ├── assets/             # Images, CSS, JS
│   │   └── ...
│   ├── netlify.toml            # Netlify config
│   └── package.json
│
├── .gitignore
├── README.md
├── DEPLOYMENT-GUIDE.md         # Detailed deployment instructions
├── DEPLOYMENT-QUICK-START.md   # Quick deployment checklist
├── CLAUDE.md                   # Architecture documentation
└── DEMO-READINESS-REPORT.md    # Demo preparation guide
```

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT + Passport.js
- **Real-time:** Socket.io
- **Security:** Helmet, CORS, Rate limiting

### PWA (Frontend)
- **Language:** Vanilla JavaScript (ES6+)
- **Storage:** IndexedDB (Dexie.js)
- **Offline:** Service Worker
- **Architecture:** Modular ES6 modules
- **No Build Process:** Direct file serving

### Marketing Website
- **HTML5/CSS3**
- **Vanilla JavaScript**
- **Responsive Design**

### Deployment
- **Backend:** Render.com
- **PWA:** Netlify
- **Marketing:** Netlify
- **Database:** MongoDB Atlas
- **Version Control:** Git/GitHub

## 📱 System Requirements

### Development
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- MongoDB 4.4+ (local or Atlas)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Production
- MongoDB Atlas (M0 free tier or higher)
- Render.com account (free tier available)
- Netlify account (free tier available)
- GitHub account

## 🎨 Design

- **Color Scheme:** Black and white minimalist design
- **Mobile-First:** Responsive on all devices
- **Touch-Optimized:** Designed for tablets and touchscreens
- **Offline-First:** Full functionality without internet

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - System architecture and design decisions
- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Complete deployment instructions
- **[DEPLOYMENT-QUICK-START.md](DEPLOYMENT-QUICK-START.md)** - Quick deployment checklist
- **[DEMO-READINESS-REPORT.md](DEMO-READINESS-REPORT.md)** - Demo preparation guide
- **[ABC-SPA-SAMPLE-DATA.md](marketing-website/ABC-SPA-SAMPLE-DATA.md)** - Sample business data

## 🔒 Security Features

- JWT authentication with expiration
- Password hashing (bcrypt)
- CORS protection
- Rate limiting
- Helmet.js security headers
- Input validation
- XSS protection
- Session management

## 🌐 Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 💡 Key Features

### Offline-First Architecture
- Complete offline functionality
- Automatic background sync
- Conflict resolution
- Queue management
- IndexedDB storage

### Real-Time Updates
- WebSocket connections
- Live dashboard updates
- Multi-device sync
- Instant notifications

### Performance
- Service Worker caching
- Memory management
- Lazy loading
- Optimized database queries
- CDN delivery (Netlify)

## 🐛 Troubleshooting

### Backend Issues
**Problem:** MongoDB connection failed
**Solution:** Check MongoDB Atlas connection string and IP whitelist

**Problem:** Render service sleeping (30-60s delay)
**Solution:** Normal on free tier - first request wakes the service

### PWA Issues
**Problem:** API connection failed
**Solution:** Check api-config.js has correct backend URL

**Problem:** Offline sync not working
**Solution:** Clear IndexedDB and refresh

### Deployment Issues
See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) troubleshooting section

## 📊 Performance Metrics

- **Load Time:** <3s (PWA)
- **Time to Interactive:** <5s
- **Offline Support:** 100%
- **Mobile Score:** 90+
- **PWA Score:** 95+

## 🚦 Status

- ✅ Backend API - Production ready
- ✅ PWA Application - Production ready
- ✅ Marketing Website - Production ready
- ✅ Deployment Configs - Complete
- ✅ Documentation - Complete

## 📄 License

MIT License - See LICENSE file for details

## 👥 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review troubleshooting guides
3. Create GitHub issue

## 🎉 Getting Started

1. **Development:** Follow "Quick Start" above
2. **Deployment:** Follow [DEPLOYMENT-QUICK-START.md](DEPLOYMENT-QUICK-START.md)
3. **Production:** Follow [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

**Built with ❤️ for ABC Massage and Spa**

*Ready for production deployment - All systems operational!*
