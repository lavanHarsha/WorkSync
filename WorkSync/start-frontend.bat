@echo off
title WorkSync Frontend
set "PATH=C:\Users\DELL\AppData\Local\Programs\nodejs;C:\Program Files\MongoDB\Server\8.3\bin;%PATH%"
cd /d "%~dp0frontend"
echo Starting WorkSync Frontend on http://localhost:5173 ...
call npm.cmd run dev
pause
