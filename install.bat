@echo off
echo ========================================
echo HackHub Installation Script
echo ========================================
echo.

echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing root dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo Error installing client dependencies
    pause
    exit /b 1
)

echo.
echo Installing server dependencies...
cd ..\server
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error installing server dependencies
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Download Firebase Admin SDK key and save as 'firebase-admin-sdk.json'
echo 2. Run 'npm run dev' to start both servers
echo 3. Open http://localhost:3000 in your browser
echo.
echo See setup.md for detailed instructions
echo.
pause
