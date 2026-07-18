@echo off
title Maze-Solving Robot Simulator Server
echo ===================================================
echo   Maze-Solving Robot Simulator Local Server
echo ===================================================
echo.
echo Opening default web browser to:
echo http://localhost:8000
echo.
start http://localhost:8000

echo Starting Python local web server on port 8000...
echo ---------------------------------------------------
echo [IMPORTANT] Keep this console window open.
echo Closing this window will automatically stop the server.
echo ---------------------------------------------------
echo.

:: Check if the 'py' command is available (Windows Python Launcher)
where py >nul 2>&1
if %errorlevel% equ 0 (
    py -m http.server 8000
) else (
    :: Fallback to direct 'python' command
    python -m http.server 8000
)

echo.
echo Web server stopped.
pause
