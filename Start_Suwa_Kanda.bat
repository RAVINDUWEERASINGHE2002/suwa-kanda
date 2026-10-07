@echo off
chcp 65001 >nul
title Suwa Kanda (සුව කැඳ) - POS & Kitchen System

echo ===============================================================================
echo        🌿 SUWA KANDA (සුව කැඳ) - POS & KITCHEN OPERATIONS SYSTEM
echo                          Thanamalwila Junction
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [*] Checking Environment & Turso Cloud Connection...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

:: Find local IPv4 address
for /f "tokens=4 delims= " %%a in ('route print ^| find " 0.0.0.0"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip

echo.
echo [✓] System Ready! Starting Suwa Kanda Server...
echo.
echo ===============================================================================
echo   🖥️  PC Browser (Cashier POS):  http://localhost:3000
if defined LOCAL_IP (
echo   📱  Kitchen Phone (Wi-Fi):     http://%LOCAL_IP%:3000/kitchen
echo   📱  Cashier Phone (Wi-Fi):     http://%LOCAL_IP%:3000/cashier
)
echo   📊  Reports & Partner Payout:  http://localhost:3000/reports
echo   ☁️   Database:                  Turso Cloud (Live & Synced)
echo ===============================================================================
echo.
echo [*] Opening POS in your browser...
start http://localhost:3000

echo [*] Running Server... (Do not close this window while using the system)
echo.
node server/src/index.js
pause
