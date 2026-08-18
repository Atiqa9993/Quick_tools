@echo off
title QuickTools Launcher
cls
echo ================================================================
echo               QUICKTOOLS APPLICATION LAUNCHER
echo ================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Setup Node Modules if missing
if not exist "%ROOT_DIR%node_modules" (
    echo [1/4] Installing Frontend dependencies (npm install)...
    call npm install
    echo.
) else (
    echo [1/4] Frontend dependencies found.
)

:: 2. Setup Python Virtual Environment if missing
if not exist "%ROOT_DIR%backend\venv" (
    echo [2/4] Creating Python Virtual Environment (venv)...
    cd /d "%ROOT_DIR%backend"
    python -m venv venv
    echo [2/4] Installing Backend dependencies (requirements.txt)...
    call .\venv\Scripts\pip.exe install -r requirements.txt
    cd /d "%ROOT_DIR%"
    echo.
) else (
    echo [2/4] Python virtual environment found.
)

:: 3. Start Backend in visible window
echo [3/4] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "QuickTools Backend" cmd /k "cd /d %ROOT_DIR%backend && .\venv\Scripts\python.exe run.py"

:: 4. Start Frontend in visible window
echo [4/4] Starting Next.js Frontend on http://localhost:3000 ...
start "QuickTools Frontend" cmd /k "cd /d %ROOT_DIR% && npm run dev"

:: 5. Open browser after short delay
echo.
echo Opening http://localhost:3000 in your default browser...
timeout /t 4 >nul
start http://localhost:3000

echo.
echo ================================================================
echo   QuickTools is running!
echo   Do not close the two open black windows (Backend & Frontend).
echo ================================================================
echo.
pause
