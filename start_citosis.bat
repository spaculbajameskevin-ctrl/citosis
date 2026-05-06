@echo off
setlocal

set "APP_DIR=%~dp0"
set "PYTHON_EXE=%APP_DIR%venv\Scripts\python.exe"
set "APP_URL=http://127.0.0.1:8000/"

cd /d "%APP_DIR%" || (
  echo Could not open the CITOSIS project folder.
  echo Expected: %APP_DIR%
  pause
  exit /b 1
)

if not exist "%PYTHON_EXE%" (
  echo Virtual environment Python was not found.
  echo Expected: %PYTHON_EXE%
  pause
  exit /b 1
)

echo Applying database migrations...
"%PYTHON_EXE%" manage.py migrate --noinput
if errorlevel 1 (
  echo Database migrations failed.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } exit 1" >nul 2>nul
if errorlevel 1 (
  echo Starting CITOSIS Django server...
  start "CITOSIS Django Server" /D "%APP_DIR%" cmd /k ""%PYTHON_EXE%" manage.py runserver 127.0.0.1:8000"
) else (
  echo CITOSIS appears to already be running on port 8000.
)

echo Waiting for CITOSIS to be ready...
for /l %%i in (1,1,20) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 1; if ($response.StatusCode -ge 200) { exit 0 } } catch { exit 1 } exit 1" >nul 2>nul
  if not errorlevel 1 goto open_app
  timeout /t 1 /nobreak >nul
)

:open_app
start "" "%APP_URL%"
