@echo off
title QuickTools Application Launcher
cls
echo ================================================================
echo               QUICKTOOLS ONE-CLICK LAUNCHER                   
echo ================================================================
echo.

:: 1. Setup Node Modules if missing
if not exist "%~dp0node_modules\" (
    echo [SETUP] Installing Frontend dependencies (npm install)...
    call npm install
    echo.
)

:: 2. Setup Python Virtual Environment if missing
if not exist "%~dp0backend\venv\" (
    echo [SETUP] Creating Python Virtual Environment (venv)...
    cd /d "%~dp0backend"
    python -m venv venv
    echo [SETUP] Installing Backend dependencies (requirements.txt)...
    call .\venv\Scripts\pip.exe install -r requirements.txt
    cd /d "%~dp0"
    echo.
)

:: 3. Start Python FastAPI Backend Server
echo [1/2] Starting Python Backend API (Port 8000)...
start "QuickTools Backend (FastAPI)" /min cmd /c "cd /d "%~dp0backend" && .\venv\Scripts\python.exe run.py"

:: Wait 3 seconds for FastAPI to initialize
timeout /t 3 /nobreak >nul

:: 4. Start Next.js Frontend Server
echo [2/2] Starting Next.js Frontend (Port 3000)...
start "QuickTools Frontend (Next.js)" cmd /c "cd /d "%~dp0" && npm run dev"

:: Wait 2 seconds and open browser
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ================================================================
echo   SUCCESS: QuickTools is running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://127.0.0.1:8000/docs
echo ================================================================
echo.
