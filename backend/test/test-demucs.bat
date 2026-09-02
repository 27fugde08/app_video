@echo off
REM ==============================================================================
REM CreatorOS PRO_V40 - Quick Demucs Runner Executable Tester (test-demucs.bat)
REM ==============================================================================
title CreatorOS - Demucs Runner Tester

echo ==============================================================================
echo [TEST_START] Dang kiem tra file demucs_runner.exe ...
echo ==============================================================================

set TEST_DIR=%~dp0test_temp
set SAMPLE_WAV=%TEST_DIR%\sample.wav
set OUTPUT_DIR=%TEST_DIR%\output

if not exist "%TEST_DIR%" mkdir "%TEST_DIR%"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM 1. Chay script Node.js test kiem tra tu dong
node %~dp0test-demucs-runner.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [TEST_SUCCESS] Demucs executable da pass tat ca cac buoc kiem tra!
    pause
    exit /b 0
) else (
    echo.
    echo [TEST_ERROR] Co loi xay ra trong qua trinh kiem tra demucs_runner.exe.
    pause
    exit /b 1
)
