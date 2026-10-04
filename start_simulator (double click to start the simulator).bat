@echo off
title Maze-Solving Robot Simulator Launcher
echo ===================================================
echo   Maze-Solving Robot Simulator Launcher
echo ===================================================
echo.
echo Opening Maze-Solving Robot Simulator in your web browser...
echo.

:: 1. Directly open index.html in default browser (standalone, no server needed)
start "" "%~dp0index.html"

:: 2. Also start Python server as a fallback server on http://localhost:8000
where py >nul 2>&1
if %errorlevel% equ 0 (
    py -m http.server 8000
) else (
    python -m http.server 8000
)

pause
