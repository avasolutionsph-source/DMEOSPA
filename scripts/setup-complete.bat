@echo off
echo ========================================
echo Ava Solutions Complete Setup
echo ========================================
echo.

echo Step 1: Installing dependencies...
cd marketing-website
call npm install
cd ../pwa-backend
call npm install
cd ..
echo Dependencies installed!
echo.

echo Step 2: Creating admin user and sample data...
cd marketing-website
call npm run seed
cd ..
echo Database seeded!
echo.

echo Step 3: Starting all services...
call .\start-dev.bat

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Your services are running on:
echo 🌐 Marketing Website: https://ava-solutions-marketing.netlify.app
echo 🔐 Admin Panel: https://ava-solutions-marketing.netlify.app/admin
echo 📱 PWA Application: https://ava-solutions-pwa.netlify.app
echo 🔧 PWA Backend: http://localhost:4000
echo.
echo ========================================
echo LOGIN CREDENTIALS
echo ========================================
echo.
echo 👑 PLATFORM SUPER ADMIN (YOU):
echo Email: avasolutionsph@gmail.com
echo Password: Ava12345
echo Role: Platform owner - manages all businesses and sync data
echo Access: https://ava-solutions-marketing.netlify.app/admin
echo Features: User management, sync cleanup, platform analytics
echo.
echo 🏢 BUSINESS OWNERS:
echo Email: spa1@example.com
echo Password: password123
echo Role: Business owner - manages their own spa
echo Access: https://ava-solutions-marketing.netlify.app/business-dashboard
echo Features: Business stats, PWA access, sync management
echo.
echo 📱 PWA ACCESS:
echo Business owners can access PWA from their dashboard
echo Direct PWA: https://ava-solutions-pwa.netlify.app
echo Demo Login: test@example.com / password123
echo.
pause
