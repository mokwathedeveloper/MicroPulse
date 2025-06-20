# Getting Started with MicroPulse

Welcome to MicroPulse - a modern, production-ready e-commerce platform built with microservice architecture!

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software
- **Docker Desktop** (includes Docker Compose)
  - [Windows/Mac Download](https://www.docker.com/products/docker-desktop/)
  - [Linux Installation Guide](https://docs.docker.com/engine/install/)
- **Git** for version control
- **Node.js 18+** (optional, for local development)

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 5GB free space
- **Ports**: Ensure these ports are available:
  - 3000 (Frontend)
  - 8000-8004 (Backend Services)
  - 27017 (MongoDB)
  - 5672, 15672 (RabbitMQ)
  - 6379 (Redis)

## Quick Start (5 Minutes)

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd micropulse
```

### Step 2: Run Setup Script

**For Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**For Windows:**
```cmd
setup.bat
```

**Alternative using npm:**
```bash
npm run setup          # Linux/Mac
npm run setup:windows  # Windows
```

### Step 3: Start the Application
```bash
# Start all services
docker-compose up -d

# Or using npm script
npm start
```

### Step 4: Verify Installation
```bash
# Check service status
docker-compose ps

# Run health check
./health-check.sh  # Linux/Mac only
```

### Step 5: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **RabbitMQ Management**: http://localhost:15672

## Demo Credentials

Use these pre-configured accounts to test the application:

### Admin Account
- **Email**: `admin@micropulse.com`
- **Password**: `admin123`
- **Permissions**: Full access to all features

### Regular User Account
- **Email**: `user@micropulse.com`
- **Password**: `user123`
- **Permissions**: Standard user features

## What Gets Started

When you run the application, the following services start:

| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| **Frontend** | 3000 | Next.js React application | http://localhost:3000 |
| **API Gateway** | 8000 | Central routing & auth | http://localhost:8000/health |
| **User Service** | 8001 | User management | http://localhost:8001/health |
| **Product Service** | 8002 | Product catalog | http://localhost:8002/health |
| **Order Service** | 8003 | Order processing (CQRS) | http://localhost:8003/health |
| **Inventory Service** | 8004 | Stock management | http://localhost:8004/health |
| **MongoDB** | 27017 | Primary database | - |
| **RabbitMQ** | 5672/15672 | Message broker | http://localhost:15672 |
| **Redis** | 6379 | Cache & sessions | - |

## First Steps After Installation

### 1. Explore the Frontend
1. Visit http://localhost:3000
2. Browse the product catalog
3. Register a new user account
4. Add items to cart
5. Complete a test order

### 2. Access Admin Features
1. Login with admin credentials
2. Navigate to admin dashboard
3. Manage products and orders
4. View real-time analytics

### 3. Monitor System Health
1. Check RabbitMQ Management: http://localhost:15672
2. View service logs: `docker-compose logs -f`
3. Monitor API responses: http://localhost:8000/health

## Common Commands

### Service Management
```bash
# Start services
npm start
docker-compose up -d

# Stop services
npm stop
docker-compose down

# Restart services
npm run restart

# Check status
npm run status
docker-compose ps

# View logs
npm run dev:logs
docker-compose logs -f

# Clean up (removes all data)
npm run clean
docker-compose down -v --remove-orphans
```

### Development Commands
```bash
# Install dependencies for all services
npm run install:all

# Start only infrastructure (for local dev)
npm run dev:infrastructure

# Run services individually
npm run dev:frontend
npm run dev:api-gateway
npm run dev:user-service
# ... etc
```

## Troubleshooting

### Services Won't Start
```bash
# Check if ports are in use
netstat -tulpn | grep :3000
lsof -i :3000  # Mac/Linux

# Clean and restart
npm run clean
npm start
```

### Database Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Frontend Not Loading
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend --no-cache
docker-compose up -d frontend
```

### Memory Issues
```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Recommended: 8GB+ for smooth operation
```

## Monitoring and Logs

### View Service Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f user-service
docker-compose logs -f product-service
docker-compose logs -f order-service
docker-compose logs -f inventory-service
docker-compose logs -f frontend
```

### Health Monitoring
```bash
# Run health check script
./health-check.sh

# Manual health checks
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

## Next Steps

Once you have the application running:

1. **Read the Architecture Guide**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
2. **Explore API Documentation**: [docs/API.md](API.md)
3. **Learn Development Workflow**: [docs/DEVELOPMENT.md](DEVELOPMENT.md)
4. **Understand Deployment**: [docs/DEPLOYMENT.md](DEPLOYMENT.md)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review service logs: `docker-compose logs -f [service-name]`
3. Run health check: `./health-check.sh`
4. Check the [FAQ](FAQ.md)
5. Create an issue in the repository

---

**Congratulations! You now have MicroPulse running locally. Happy exploring!**
