@echo off
setlocal enabledelayedexpansion

:: MicroPulse Setup Script for Windows
echo Setting up MicroPulse E-commerce Platform...
echo.

:: Check if Docker is installed
echo [INFO] Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://docs.docker.com/desktop/windows/
    pause
    exit /b 1
) else (
    echo [SUCCESS] Docker is installed
)

:: Check if Docker Compose is installed
echo [INFO] Checking Docker Compose installation...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Docker Compose is not installed!
        echo Please install Docker Compose
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] Docker Compose (v2) is installed
    )
) else (
    echo [SUCCESS] Docker Compose is installed
)

:: Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js is not installed. It's recommended for local development.
    echo Install from: https://nodejs.org/
) else (
    echo [SUCCESS] Node.js is installed
)

echo.
echo [INFO] Creating environment files...

:: Create API Gateway .env
(
echo NODE_ENV=development
echo API_GATEWAY_PORT=8000
echo WS_PORT=8080
echo MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
echo RABBITMQ_URL=amqp://admin:password123@localhost:5672
echo REDIS_URL=redis://:password123@localhost:6379
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
echo USER_SERVICE_URL=http://localhost:8001
echo PRODUCT_SERVICE_URL=http://localhost:8002
echo ORDER_SERVICE_URL=http://localhost:8003
echo INVENTORY_SERVICE_URL=http://localhost:8004
) > services\api-gateway\.env

:: Create User Service .env
(
echo NODE_ENV=development
echo USER_SERVICE_PORT=8001
echo MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
echo RABBITMQ_URL=amqp://admin:password123@localhost:5672
echo REDIS_URL=redis://:password123@localhost:6379
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
) > services\user-service\.env

:: Create Product Service .env
(
echo NODE_ENV=development
echo PRODUCT_SERVICE_PORT=8002
echo MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
echo RABBITMQ_URL=amqp://admin:password123@localhost:5672
echo REDIS_URL=redis://:password123@localhost:6379
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
) > services\product-service\.env

:: Create Order Service .env
(
echo NODE_ENV=development
echo ORDER_SERVICE_PORT=8003
echo MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
echo RABBITMQ_URL=amqp://admin:password123@localhost:5672
echo REDIS_URL=redis://:password123@localhost:6379
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo USER_SERVICE_URL=http://localhost:8001
echo PRODUCT_SERVICE_URL=http://localhost:8002
echo INVENTORY_SERVICE_URL=http://localhost:8004
) > services\order-service\.env

:: Create Inventory Service .env
(
echo NODE_ENV=development
echo INVENTORY_SERVICE_PORT=8004
echo MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
echo RABBITMQ_URL=amqp://admin:password123@localhost:5672
echo REDIS_URL=redis://:password123@localhost:6379
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo ORDER_SERVICE_URL=http://localhost:8003
echo PRODUCT_SERVICE_URL=http://localhost:8002
) > services\inventory-service\.env

:: Create Frontend .env
(
echo NEXT_PUBLIC_API_URL=http://localhost:8000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:8080
) > frontend\.env.local

echo [SUCCESS] Environment files created!
echo.
echo ============================================
echo Setup completed successfully!
echo ============================================
echo.
echo Next Steps:
echo ============================================
echo 1. Start the application:
echo    docker-compose up -d
echo.
echo 2. View logs:
echo    docker-compose logs -f
echo.
echo 3. Access the application:
echo    • Frontend: http://localhost:3000
echo    • API Gateway: http://localhost:8000
echo    • RabbitMQ Management: http://localhost:15672 (admin/password123)
echo.
echo 4. Demo Credentials:
echo    • Admin: admin@micropulse.com / admin123
echo    • User: user@micropulse.com / user123
echo.
echo 5. Stop the application:
echo    docker-compose down
echo.
echo ============================================
pause
