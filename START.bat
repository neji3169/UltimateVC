@echo off
title UltimateVC - Realtime AI Voice Converter
color 0b
chcp 65001 >nul
cd /d "%~dp0"
cls

echo =========================================================================
echo       UltimateVC - Realtime AI Voice Converter (RVC / CUDA Edition)
echo =========================================================================
echo.

:: 1. Ensure embedded python path configuration includes win32 modules
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

:: 2. Check if the Python embedded runtime already exists
if exist "runtime\python.exe" (
    echo [OK] Runtime found. Launching UltimateVC...
    runtime\python.exe launcher.py
    if %errorlevel% neq 0 (
        echo.
        echo [INFO] Press any key to exit...
        pause >nul
    )
    exit /b
)

:: 3. If runtime does not exist, run initial setup automatically
echo [1/2] First-time setup detected. Setting up UltimateVC environment...
call setup.bat

:: 4. Launch UltimateVC
echo.
echo [2/2] Setup complete. Launching UltimateVC...
if exist "runtime\python.exe" (
    runtime\python.exe launcher.py
) else (
    echo [ERROR] runtime\python.exe could not be found. Please check setup.bat output.
    pause
)
