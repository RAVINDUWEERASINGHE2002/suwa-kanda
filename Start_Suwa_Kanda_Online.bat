@echo off
chcp 65001 >nul
title Suwa Kanda (සුව කැඳ) - Online Internet Access

echo ===============================================================================
echo        🌿 SUWA KANDA (සුව කැඳ) - 100%% FREE ONLINE INTERNET ACCESS
echo           (No Credit Card Required • Works on Mobile Data Anywhere)
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [*] Starting Local Server in Background...
start /b node server/src/index.js >nul 2>&1

timeout /t 2 >nul

echo [*] Creating Free Public HTTPS Tunnel...
echo.
echo ===============================================================================
echo   👉 COPY THE HTTPS URL BELOW AND OPEN ON ANY PHONE ANYWHERE:
echo.
echo   • Kitchen Display:   [YOUR_URL]/kitchen
echo   • Cashier POS:       [YOUR_URL]/cashier
echo   • Reports:           [YOUR_URL]/reports
echo ===============================================================================
echo.

npx -y localtunnel --port 3000
pause
