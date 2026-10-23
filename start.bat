@echo off
title WorkSync Platform Launcher
echo ========================================================
echo        WorkSync - Automation Platform Launcher
echo ========================================================
echo.

:: Ensure Node.js is in PATH for this session
set "PATH=C:\Program Files\nodejs;%PATH%"

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    pause
    exit /b 1
)

echo [1/3] Checking MongoDB Service...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo Starting MongoDB service...
    net start MongoDB >nul 2>nul
)
echo [OK] MongoDB is running.
echo.

echo [2/3] Launching WorkSync Backend and Frontend...
echo Backend API will run on: http://localhost:5000
echo Frontend UI will run on: http://localhost:5173
echo.

:: Open default browser after 3 seconds in background
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: Run root dev command which starts backend + frontend concurrently
cd /d "%~dp0"
call npm.cmd run dev

pause
