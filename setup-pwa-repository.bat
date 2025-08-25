@echo off
echo Creating PWA Repository Structure...

:: Create PWA directory
mkdir PWA-Repository 2>nul
cd PWA-Repository

:: Copy root files
copy ..\index.html .
copy ..\login.html .
copy ..\register.html .
copy ..\manifest.json .
copy ..\service-worker.js .
copy ..\styles.css .
copy ..\updates.json .

:: Copy directories
xcopy ..\js js\ /E /I /Y
xcopy ..\icons icons\ /E /I /Y

:: Copy configuration files
copy ..\netlify.toml.pwa netlify.toml
copy "..\PWA-Repository-Files.txt" README-files.txt

:: Create _headers file for PWA
echo # PWA Headers > _headers
echo /service-worker.js >> _headers
echo   Cache-Control: no-cache >> _headers
echo. >> _headers
echo /manifest.json >> _headers
echo   Content-Type: application/manifest+json >> _headers
echo. >> _headers
echo /* >> _headers
echo   X-Frame-Options: DENY >> _headers

echo.
echo ✅ PWA Repository structure created successfully!
echo.
echo Next steps:
echo 1. Create GitHub repository: AvasolutionsPH-PWA
echo 2. Run: cd PWA-Repository
echo 3. Run: git init
echo 4. Run: git add .
echo 5. Run: git commit -m "Initial PWA repository setup"
echo 6. Run: git remote add origin https://github.com/YOUR-USERNAME/AvasolutionsPH-PWA.git
echo 7. Run: git push -u origin main
echo.
pause