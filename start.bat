@echo off
echo.
echo ========================================
echo   Ava Solutions - Quick Start
echo ========================================
echo.

echo Installing backend dependencies...
cd backend
call npm install

echo.
echo Starting backend server...
start "Backend Server" cmd /c "npm run dev"

echo.
echo Backend server starting on http://localhost:4000
echo.
echo To start frontends, open new terminals and run:
echo.
echo   Marketing Website:
echo   cd frontend-marketing
echo   python -m http.server 3000
echo.
echo   PWA Dashboard:
echo   cd frontend-pwa  
echo   python -m http.server 3001
echo.
echo   Booking Website:
echo   cd frontend-booking
echo   python -m http.server 3002
echo.
echo ========================================
echo   URLs:
echo   Backend API: http://localhost:4000
echo   Marketing:   http://localhost:3000
echo   PWA:         http://localhost:3001
echo   Booking:     http://localhost:3002
echo ========================================
echo.
pause