@echo off
setlocal

set "APP_DIR=%~dp0"
set "PYTHON_EXE=%APP_DIR%venv\Scripts\python.exe"
set "PORT=8000"

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

for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1 -ExpandProperty IPAddress)"') do set "LAN_IP=%%i"

echo Applying database migrations...
"%PYTHON_EXE%" manage.py migrate --noinput
if errorlevel 1 (
  echo Database migrations failed.
  pause
  exit /b 1
)

echo Starting CITOSIS on all network interfaces...
echo Local:   http://127.0.0.1:%PORT%/
if defined LAN_IP echo Network: http://%LAN_IP%:%PORT%/
echo.
echo Keep this window open while using CITOSIS.
"%PYTHON_EXE%" manage.py runserver 0.0.0.0:%PORT%

pause
