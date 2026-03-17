@echo off
title BrewBeats Dev Server (Clean)
echo.
echo  ==============================
echo   BrewBeats - Clean Start
echo  ==============================
echo.
cd /d "%~dp0"
echo  Killing stale Node processes...
taskkill /f /im node.exe >nul 2>&1
echo  Clearing .next cache...
rmdir /s /q .next 2>nul
echo  Starting fresh on http://localhost:3000
echo  Press Ctrl+C to stop
echo.
npm run dev
