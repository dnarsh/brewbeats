@echo off
echo.
echo  ==============================
echo   BrewBeats - Stopping Server
echo  ==============================
echo.
echo  Killing all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
echo  Clearing .next cache...
cd /d "%~dp0"
rmdir /s /q .next 2>nul
echo.
echo  Server stopped and cache cleared.
echo.
pause
