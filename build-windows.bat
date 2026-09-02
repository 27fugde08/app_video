@echo off
TITLE CreatorOS Desktop - Windows Application Builder
COLOR 0A
cls

echo ====================================================================
echo   CREATOROS DESKTOP - WINDOWS APP BUILDER (ELECTRON + NODE BACKEND)
echo ====================================================================
echo.

:: 1. Check Node.js
echo [1/4] Kiem tra moi truong Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] May tinh chua cai dat Node.js. Vui long cai dat Node.js v18+ truoc!
    pause
    exit /b
)
echo      - Node.js da san sang: OK

:: 2. Install dependencies
echo.
echo [2/4] Cai dat thu vien Frontend, Backend & Electron Packaging...
call npm install
call npm install --save-dev electron electron-builder

echo.
echo [3/4] Bien dich giao dien Frontend (Vite Production Build)...
call npm run build

:: 3. Build Windows Executable
echo.
echo [4/4] Dong goi bo cai dat Windows (.exe / NSIS Installer ^& Portable)...
call npx electron-builder --win --x64

echo.
echo ====================================================================
echo   BUILD THANH CONG! TIEP THEO:
echo ====================================================================
echo   File cai dat Windows (.exe) da duoc tao tai thu muc:
echo   - /release/CreatorOS Desktop Setup 1.0.0.exe (Bo cai dat Wizard)
echo   - /release/CreatorOS Desktop 1.0.0.exe (Ban Portable chay ngay)
echo ====================================================================
echo.
pause
