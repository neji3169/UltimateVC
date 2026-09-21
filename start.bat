@echo off
cd /d "%~dp0"
title UltimateVC - Realtime AI Voice Converter

:: If python runtime does not exist, trigger setup first
if not exist "runtime\python.exe" (
    echo [INFO] Python runtime not found. Starting setup.bat...
    call setup.bat
)

:: Ensure embedded python path configuration includes win32 modules
if exist "runtime\python312._pth" (
    findstr /i "win32" "runtime\python312._pth" >nul 2>&1
    if errorlevel 1 (
        (
            echo python312.zip
            echo .
            echo Lib\site-packages
            echo Lib\site-packages\win32
            echo Lib\site-packages\win32\lib
            echo Lib\site-packages\Pythonwin
            echo import site
        ) > "runtime\python312._pth"
    )
)

:: Copy pywin32 DLLs if they are in pywin32_system32 but not in runtime root
if exist "runtime\Lib\site-packages\pywin32_system32\pywintypes312.dll" (
    if not exist "runtime\pywintypes312.dll" (
        copy /Y "runtime\Lib\site-packages\pywin32_system32\*.dll" "runtime\" >nul 2>&1
        copy /Y "runtime\Lib\site-packages\pywin32_system32\*.dll" "runtime\Lib\site-packages\win32\" >nul 2>&1
    )
)

echo Starting UltimateVC...
runtime\python.exe launcher.py
if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] If you encountered an error, try running setup.bat to reinstall dependencies.
    pause
)
