@echo off
title BrewBeats Dev Server
echo.
echo  ==============================
echo   BrewBeats - Starting Server
echo  ==============================
echo.
cd /d "%~dp0"
echo  Starting on http://localhost:3000
echo  Browser will open in 5 seconds...
echo  Press Ctrl+C to stop
echo.
start "" npm run dev
timeout /t 5 /nobreak > nul
start http://localhost:3000
