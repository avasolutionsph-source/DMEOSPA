# Ava Solutions - Complete Setup Guide

## 🚀 Quick Start (All Components)

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running (or MongoDB Atlas account)
- Git installed

### 1. Clone and Setup PWA Backend
```bash
cd pwa-backend
npm install
cp env.example .env
# Edit .env with your MongoDB URI and settings
npm run dev
```
**Backend will run on: http://localhost:4000**

### 2. Setup Marketing Website
```bash
cd marketing-website
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and settings
npm run seed  # Creates admin user
npm run dev
```
**Website will run on: http://localhost:3000**

### 3. Setup PWA (Main Application)
The PWA is already configured and ready to use. Simply:
1. Open `index.html` in a web browser, or
2. Serve it using a local server:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Using Node.js http-server
   npx http-server -p 8080
   ```
**PWA will run on: http://localhost:8080**

## 🔧 Configuration

### PWA Configuration
1. Open the PWA in your browser
2. Go to Settings
3. The API URL should automatically be set to `http://localhost:4000`
4. Test the connection by trying to login with demo credentials:
   - Email: `demo@spa.com`
   - Password: `demo123`

### Database Setup
The applications will automatically create the necessary database collections when you first run them.

## 🧪 Testing the Complete System

1. **Test PWA Backend**: Visit http://localhost:4000/api/health
2. **Test Marketing Website**: Visit http://localhost:3000
3. **Test PWA**: Visit http://localhost:8080 (or wherever you're serving it)
4. **Test Integration**: 
   - Register a new account on the marketing website
   - Download/access the PWA
   - Login with the same credentials
   - Create some test data (products, inventory, etc.)
   - Check that data syncs between PWA and backend

## 🔍 Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Make sure MongoDB is running
   - Check your connection string in `.env` files
   - For local MongoDB: `mongodb://localhost:27017/database-name`

2. **CORS Errors**
   - Check that ALLOWED_ORIGINS in `.env` includes your PWA URL
   - Default includes common development URLs

3. **PWA Not Connecting to Backend**
   - Check that PWA backend is running on port 4000
   - Verify API URL in PWA settings
   - Check browser console for error messages

4. **Admin Panel Access**
   - Use credentials from marketing-website/.env
   - Default: admin@avasolutions.com / change-this-password

## 📱 Production Deployment

### For Production:
1. **PWA**: Deploy to CDN or static hosting (Netlify, Vercel, etc.)
2. **PWA Backend**: Deploy to cloud service (Railway, Render, Heroku, etc.)
3. **Marketing Website**: Deploy to cloud service with domain
4. **Database**: Use MongoDB Atlas for production

### Environment Variables for Production:
- Set `NODE_ENV=production`
- Use secure JWT secrets
- Configure proper CORS origins
- Set up SSL certificates
- Configure proper MongoDB connection strings

## 🎯 Next Steps

1. Customize the marketing website with your branding
2. Set up Stripe for subscription payments
3. Configure email services for notifications
4. Add your own domain names
5. Set up SSL certificates
6. Configure backup strategies
7. Set up monitoring and logging

## 📞 Support

If you encounter any issues:
1. Check the console logs in your browser
2. Check the server logs in your terminal
3. Verify all environment variables are set correctly
4. Ensure all services are running on the correct ports
