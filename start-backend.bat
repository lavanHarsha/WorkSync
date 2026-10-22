@echo off
title WorkSync Backend
set "PATH=C:\Users\DELL\AppData\Local\Programs\nodejs;C:\Program Files\MongoDB\Server\8.3\bin;%PATH%"
cd /d "%~dp0backend"
echo Starting WorkSync Backend on http://localhost:5000 ...
call npm.cmd run dev
pause
