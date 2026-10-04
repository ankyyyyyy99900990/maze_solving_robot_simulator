@echo off
title Maze-Solving Robot Simulator Server
echo ===================================================
echo   Maze-Solving Robot Simulator Server
echo ===================================================
echo.
cd /d "%~dp0"
echo Serving folder: %CD%
echo Opening http://localhost:8000 ...
echo.

start http://localhost:8000

where py >nul 2>&1
if %errorlevel% equ 0 (
    py -c "import os, http.server, socketserver; os.chdir(r'%~dp0'); handler = http.server.SimpleHTTPRequestHandler; server = socketserver.TCPServer(('', 8000), handler); print('Server running at http://localhost:8000'); server.serve_forever()"
) else (
    python -c "import os, http.server, socketserver; os.chdir(r'%~dp0'); handler = http.server.SimpleHTTPRequestHandler; server = socketserver.TCPServer(('', 8000), handler); print('Server running at http://localhost:8000'); server.serve_forever()"
)

pause
