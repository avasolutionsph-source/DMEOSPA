@echo off
echo Creating admin user and sample data...
cd marketing-website
npm run seed
cd ..
echo Database seeded successfully!
echo.
echo Admin Login Credentials:
echo Email: avasolutionsph@gmail.com
echo Password: Ava12345
echo.
echo Admin Panel: https://ava-solutions-marketing.netlify.app/admin
pause
