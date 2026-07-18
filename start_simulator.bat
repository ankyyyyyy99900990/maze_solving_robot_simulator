@echo off
title Maze-Solving Robot Simulator Launcher
echo ===================================================
echo   Maze-Solving Robot Simulator Local Launcher
echo ===================================================
echo.
echo Starting local web server on port 8000...

:: Run a powershell command to start the python server process in the background and capture its PID
for /f "tokens=*" %%i in ('powershell -Command "$p = Start-Process py -ArgumentList '-m http.server 8000' -NoNewWindow -PassThru; $p.Id"') do set SERVER_PID=%%i

if "%SERVER_PID%"=="" (
    echo Failed to start local server. Please ensure Python is installed.
    pause
    exit /b
)

echo Local server started successfully (Process ID: %SERVER_PID%).
echo Opening browser at http://localhost:8000 ...

:: Brief delay to allow the server socket to bind
timeout /t 1 /nobreak >nul
start http://localhost:8000

echo.
echo ---------------------------------------------------
echo Web server is ACTIVE. 
echo Keep this window open while using the simulator.
echo.
echo Press any key to STOP the server and close...
echo ---------------------------------------------------
pause >nul

echo.
echo Stopping web server (PID %SERVER_PID%)...
taskkill /PID %SERVER_PID% /F >nul 2>&1
echo Web server stopped. Closed successfully.
