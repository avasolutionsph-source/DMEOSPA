@echo off
echo Starting Ava Solutions Three-Server Architecture...
echo.

echo [1/3] Starting PWA Backend on port 4000...
start "PWA Backend" cmd /k "cd pwa-backend && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Marketing Website on port 3001...
start "Marketing Website" cmd /k "cd marketing-website && npm run dev"
timeout /t 3 /nobreak >nul

echo [3/3] Starting PWA Application on port 8080...
start "PWA Application" cmd /k "npx http-server -p 8080 -c-1"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Three-Server Architecture Started!
echo ========================================
echo 🔧 PWA Backend:      http://localhost:4000/api/health
echo 🌐 Marketing Site:   http://localhost:3001
echo 📱 PWA Application:  http://localhost:8080
echo.
echo ✅ PWA connects to Backend (port 4000)
echo ✅ Marketing Site has its own API (port 3001)
echo ✅ All three servers run independently
echo.
echo Press any key to close this window...
pause >nul
