@echo off
title Auto Buy Bot
color 0A
echo ================================
echo   AUTO BUY BOT - STARTING
echo ================================
echo.

cd /d "%~dp0"
echo [*] Checking for updates...
echo.

echo [*] Starting bot...
node index.js

echo.
echo ================================
echo   BOT STOPPED
echo ================================
pause
