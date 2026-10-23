@echo off
title WorkSync Backend
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0backend"
echo Starting WorkSync Backend on http://localhost:5000 ...
call npm.cmd run dev
pause
