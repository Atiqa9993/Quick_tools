@echo off
title QuickTools Launcher
cls
echo ================================================================
echo               QUICKTOOLS APPLICATION LAUNCHER
echo ================================================================
echo.

cd /d "%~dp0"

if exist "node_modules" goto check_venv
echo [1/4] Installing Frontend dependencies...
call npm install

:check_venv
if exist "backend\venv" goto start_servers
echo [2/4] Setting up Python Virtual Environment...
cd /d "%~dp0backend"
python -m venv venv
call .\venv\Scripts\pip.exe install -r requirements.txt
cd /d "%~dp0"

:start_servers
echo [3/4] Starting FastAPI Backend...
start "QuickTools Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe run.py"

echo [4/4] Starting Next.js Frontend...
start "QuickTools Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Launching http://localhost:3000 ...
timeout /t 3 >nul
start http://localhost:3000

echo.
echo ================================================================
echo   QuickTools is running!
echo   Do not close the open command prompt windows.
echo ================================================================
echo.
pause
