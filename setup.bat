@echo off
REM Setup script for Emergency Response System on Windows

echo ================================
echo Emergency Response System Setup
echo ================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js v18 or higher.
    exit /b 1
)

echo OK Node.js version:
node -v
echo OK npm version:
npm -v
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo O Creating .env file from template...
    copy .env.example .env
    echo OK Created .env file. Please update it with your MongoDB URI and JWT secret.
) else (
    echo OK .env file already exists
)

echo.
echo P Installing dependencies...
echo.

REM Install root dependencies
npm install

REM Install each service's dependencies
echo.
echo Installing Auth Service dependencies...
cd services\auth-service
npm install
cd ..\..

echo Installing Incident Service dependencies...
cd services\incident-service
npm install
cd ..\..

echo Installing Dispatch Service dependencies...
cd services\dispatch-service
npm install
cd ..\..

echo Installing Analytics Service dependencies...
cd services\analytics-service
npm install
cd ..\..

echo.
echo ================================
echo OK Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Update .env file with your configuration
echo 2. Ensure MongoDB is running
echo 3. Run: npm run dev (for development with auto-reload)
echo 4. Run: npm start (for production)
echo.
echo Access Swagger UI at:
echo   Auth Service: http://localhost:3001/api-docs
echo   Incident Service: http://localhost:3002/api-docs
echo   Dispatch Service: http://localhost:3003/api-docs
echo   Analytics Service: http://localhost:3004/api-docs
echo.
