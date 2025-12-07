@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Launcher.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Launcher exited with error code %ERRORLEVEL%.
    pause
)
