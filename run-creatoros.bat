@echo off
chcp 65001 >nul
title CreatorOS PRO_V40 Launcher
setlocal enabledelayedexpansion

echo ================================================================
echo  🚀 CreatorOS PRO_V40 - Khởi Chạy Nhanh (Windows Batch Launcher)
echo ================================================================

:: Chuyển sang thư mục hiện tại của script
cd /d "%~dp0"

:: 1. Kiểm tra PowerShell
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Không tìm thấy PowerShell trên hệ điều hành Windows!
    pause
    exit /b 1
)

:: 2. Thực thi PowerShell Script với ExecutionPolicy Bypass
echo [>>] Đang chuyển tiếp sang bộ kiểm tra môi trường và build PowerShell...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-creatoros.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Quá trình khởi chạy gặp lỗi.
    pause
)

endlocal
