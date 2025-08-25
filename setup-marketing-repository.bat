@echo off
echo Creating Marketing Website Repository Structure...

:: Create Marketing directory
mkdir Marketing-Repository 2>nul
cd Marketing-Repository

:: Copy HTML files from marketing-website/public/
copy "..\marketing-website\public\index.html" .
copy "..\marketing-website\public\admin.html" .
copy "..\marketing-website\public\login.html" .
copy "..\marketing-website\public\register.html" .
copy "..\marketing-website\public\pricing.html" .
copy "..\marketing-website\public\features.html" .
copy "..\marketing-website\public\contact.html" .
copy "..\marketing-website\public\business-dashboard.html" .
copy "..\marketing-website\public\404.html" .
copy "..\marketing-website\public\about.html" .
copy "..\marketing-website\public\download.html" .
copy "..\marketing-website\public\admin-login.html" .

:: Copy assets directory
xcopy "..\marketing-website\public\assets" assets\ /E /I /Y

:: Copy configuration files
copy ..\netlify.toml.marketing netlify.toml
copy "..\Marketing-Repository-Files.txt" README-files.txt

:: Create _headers file for Marketing
echo # Marketing Website Headers > _headers
echo /assets/* >> _headers
echo   Cache-Control: public, max-age=31536000 >> _headers
echo. >> _headers
echo /* >> _headers
echo   X-Frame-Options: DENY >> _headers

echo.
echo ✅ Marketing Repository structure created successfully!
echo.
echo Next steps:
echo 1. Create GitHub repository: AvasolutionsPH-Marketing
echo 2. Run: cd Marketing-Repository
echo 3. Run: git init
echo 4. Run: git add .
echo 5. Run: git commit -m "Initial marketing website repository setup"
echo 6. Run: git remote add origin https://github.com/YOUR-USERNAME/AvasolutionsPH-Marketing.git
echo 7. Run: git push -u origin main
echo.
pause