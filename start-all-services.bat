@echo off
echo 🚀 Starting All Ava Solutions Services with Unified Database
echo ================================================================

REM Set unified database environment variables
set MONGODB_URI=mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions
set MONGO_URI=mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions

echo 🔧 Environment configured for unified database: ava-marketing-website
echo.

REM Kill existing node processes
taskkill /f /im node.exe 2>nul >nul

REM Start services
echo 🌐 Starting Backend (Port 4001)...
start "Backend" cmd /c "cd backend && set PORT=4001 && npm run dev"

timeout /t 3 >nul

echo 🖥️  Starting Marketing Website (Port 3003)...
start "Marketing" cmd /c "cd marketing-website && set PORT=3003 && npm run dev"

timeout /t 3 >nul

echo 📱 Starting PWA (Port 8082)...
start "PWA" cmd /c "cd PWA-Repository && npx http-server -p 8082"

echo.
echo ✅ All services starting with unified ava-marketing-website database
echo 📍 Backend API: http://localhost:4001
echo 🌐 Marketing Website: http://localhost:3003  
echo 📱 PWA App: http://localhost:8082
echo.
echo Press any key to exit...
pause >nul