@echo off
echo Fixing all role HTML files...

for %%f in (admin.html manager.html employee.html therapist.html receptionist.html) do (
    echo Processing %%f
    
    REM Create temp file with fixed content
    powershell -Command "(Get-Content %%f) -replace 'js/role-auth-check.js', 'js/mongodb-api.js' | Set-Content %%f.tmp"
    powershell -Command "(Get-Content %%f.tmp) -replace 'js/force-logout.js', 'js/fix-owner-page.js' | Set-Content %%f.tmp2"
    
    REM Move temp file back
    move /Y %%f.tmp2 %%f >nul
    del %%f.tmp >nul
)

echo Done!