@echo off
title Auto Buy Bot - Auto Restart
color 0B
echo ================================
echo   AUTO BUY BOT - AUTO RESTART
echo   (Bot se tu dong khoi dong lai khi crash)
echo ================================
echo.

:start
cd /d "%~dp0"
echo [%TIME%] Starting bot...
node index.js

echo.
echo [%TIME%] Bot stopped! Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto start
