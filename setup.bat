@echo off
title UltimateVC - Setup Environment
cd /d "%~dp0"

mkdir configs 2>nul
mkdir configs\presets 2>nul

echo =========================================================================
echo       UltimateVC - Environment and Dependency Setup
echo =========================================================================
echo.

rem Check if runtime already exists
if exist "runtime\python.exe" (
    echo [INFO] Python runtime found. Verifying environment paths and modules...
) else (
    echo [1/5] Downloading Python 3.12.8 embedded package...
    curl -L "https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip" -o python_embed.zip
    
    echo [2/5] Extracting Python...
    powershell -command "Expand-Archive -Force python_embed.zip runtime"
    del python_embed.zip
    
    echo Creating directories...
    if not exist "runtime\Lib" mkdir "runtime\Lib"
    if not exist "runtime\Lib\site-packages" mkdir "runtime\Lib\site-packages"
    if not exist "runtime\Scripts" mkdir "runtime\Scripts"
    
    echo Installing pip...
    curl -L "https://bootstrap.pypa.io/get-pip.py" -o runtime\get-pip.py
    runtime\python.exe runtime\get-pip.py
    del runtime\get-pip.py
)

rem Crucial for Windows: Configure python312._pth with site-packages and pywin32 directories
echo [INFO] Configuring Python embedded module paths...
(
    echo python312.zip
    echo .
    echo Lib\site-packages
    echo Lib\site-packages\win32
    echo Lib\site-packages\win32\lib
    echo Lib\site-packages\Pythonwin
    echo import site
) > runtime\python312._pth

if not exist "runtime\Lib\site-packages" mkdir "runtime\Lib\site-packages"
(
    echo win32
    echo win32\lib
    echo Pythonwin
) > runtime\Lib\site-packages\pywin32.pth

echo [3/5] Installing Packages and PyTorch (CUDA 12.8)...
runtime\python.exe -m pip install --no-warn-script-location torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
runtime\python.exe -m pip install --no-warn-script-location python-dotenv==1.0.1
runtime\python.exe -m pip install --no-warn-script-location sounddevice==0.5.1
runtime\python.exe -m pip install --no-warn-script-location local-attention==1.9.15
runtime\python.exe -m pip install --no-warn-script-location faiss-cpu
runtime\python.exe -m pip install --no-warn-script-location customtkinter==5.2.2
runtime\python.exe -m pip install --no-warn-script-location pyrnnoise==0.2.7
runtime\python.exe -m pip install --no-warn-script-location librosa==0.9.1
runtime\python.exe -m pip install --no-warn-script-location transformers==4.47.1
runtime\python.exe -m pip install --no-warn-script-location pywin32==308
runtime\python.exe -m pip install --no-warn-script-location pedalboard==0.9.16
runtime\python.exe -m pip install --no-warn-script-location CTkMessagebox==2.7
runtime\python.exe -m pip install --no-warn-script-location silero-vad==5.1.2
runtime\python.exe -m pip install --no-warn-script-location keyboard==0.13.5
runtime\python.exe -m pip install --no-warn-script-location pydub==0.25.1
runtime\python.exe -m pip install --no-warn-script-location matplotlib==3.10.1
runtime\python.exe -m pip install --no-warn-script-location pystray
runtime\python.exe -m pip install --no-warn-script-location psutil
runtime\python.exe -m pip install --no-warn-script-location numpy==1.26.4
runtime\python.exe -m pip install --no-warn-script-location rich==14.0.0
runtime\python.exe -m pip install --no-warn-script-location triton-windows
runtime\python.exe -m pip install --no-warn-script-location swift-f0
runtime\python.exe -m pip install --no-warn-script-location https://github.com/codename0og/codename-essentials/raw/refs/heads/main/ring_attention_pytorch-0.5.17-py3-none-any.whl

rem Fix pywin32 DLLs and post-install
if exist "runtime\Lib\site-packages\pywin32_system32" (
    echo [INFO] Linking pywin32 system DLLs...
    copy /Y "runtime\Lib\site-packages\pywin32_system32\*.dll" "runtime\" >nul 2>&1
    copy /Y "runtime\Lib\site-packages\pywin32_system32\*.dll" "runtime\Lib\site-packages\win32\" >nul 2>&1
)
if exist "runtime\Scripts\pywin32_postinstall.py" (
    runtime\python.exe runtime\Scripts\pywin32_postinstall.py -install >nul 2>&1
)

rem Check if Tkinter already exists
if exist "runtime\tcl86t.dll" (
    echo Tkinter already exists, skipping extraction...
) else (
    echo Extracting Tkinter...
    powershell -command "Expand-Archive -Force zips\tkinter3128.zip runtime"
)

rem Assets download
set "download_assets=false"
if not exist "assets/contentvec/pytorch_model.bin" set "download_assets=true"
if not exist "assets/spin/pytorch_model.bin" set "download_assets=true"
if not exist "assets/upscaler/24kto48k/g_24kto48k" set "download_assets=true"
if not exist "assets/upscaler/24kto48k/config.json" set "download_assets=true"
if not exist "assets/contentvec/config.json" set "download_assets=true"
if not exist "assets/spin/config.json" set "download_assets=true"
if not exist "assets/rmvpe/rmvpe.pt" set "download_assets=true"
if not exist "assets/fcpe/fcpe_c_v001.pt" set "download_assets=true"
if "%download_assets%"=="false" (
    echo Assets already exist, skipping assets download.
) else (
    echo Downloading assets...
    curl -L "https://huggingface.co/datasets/dr87/vc-assets/resolve/main/assets.zip" -o assets.zip
    echo Extracting assets...
    powershell -command "Expand-Archive -Force assets.zip ."
    del assets.zip
)

echo Downloading FFmpeg...
if exist "ffmpeg.exe" (
    echo ffmpeg.exe already exists, skipping FFmpeg download.
) else (
    curl -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip" -o ffmpeg.zip
    echo Extracting ffmpeg.exe...
    powershell -command "Expand-Archive -Force ffmpeg.zip temp_ffmpeg"
    move /Y temp_ffmpeg\ffmpeg-master-latest-win64-gpl-shared\bin\ffmpeg.exe .
    rd /s /q temp_ffmpeg
    del ffmpeg.zip
)

echo.
echo =========================================================================
echo       [SUCCESS] UltimateVC Setup complete!
echo =========================================================================
pause
