@echo off
title Maze-Solving Robot Simulator Launcher
echo ===================================================
echo   Maze-Solving Robot Simulator Server
echo ===================================================
echo.
echo Starting server for folder: %~dp0
echo Opening http://localhost:8000 ...
echo.

start http://localhost:8000

where py >nul 2>&1
if %errorlevel% equ 0 (
    py -m http.server 8000 --directory "%~dp0"
) else (
    python -m http.server 8000 --directory "%~dp0"
)

pause
