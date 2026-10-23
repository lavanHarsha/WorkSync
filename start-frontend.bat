@echo off
title WorkSync Frontend
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0frontend"
echo Starting WorkSync Frontend on http://localhost:5173 ...
call npm.cmd run dev
pause
