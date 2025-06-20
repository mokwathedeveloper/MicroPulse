#  MicroPulse Quick Start Guide

Get MicroPulse up and running in just a few minutes!

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (includes Docker Compose)
  - Windows/Mac: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Linux: [Install Docker Engine](https://docs.docker.com/engine/install/) + [Docker Compose](https://docs.docker.com/compose/install/)
- **Git** for cloning the repository
- **Node.js 18+** (optional, for local development)

## Quick Start (Docker - Recommended)

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd micropulse
```

### 2. Run Setup Script

**For Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**For Windows:**
```cmd
setup.bat
```

**Or manually using npm:**
```bash
npm run setup          # Linux/Mac
npm run setup:windows  # Windows
```

### 3. Start the Application
```bash
# Start all services
docker-compose up -d

# Or using npm script
npm start
```

### 4. Verify Services are Running
```bash
# Check service status
docker-compose ps

# Or using npm script
npm run status
```

### 5. Access the Application

Once all services are running, you can access:

- **Frontend (Next.js)**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `password123`

## Demo Credentials

Use these credentials to test the application:

**Admin User:**
- Email: `admin@micropulse.com`
- Password: `admin123`

**Regular User:**
- Email: `user@micropulse.com`
- Password: `user123`

## Useful Commands

### Service Management
```bash
# Start services
npm start

# Stop services
npm stop

# Restart services
npm run restart

# View logs (all services)
npm run dev:logs

# View logs (specific service)
docker-compose logs -f api-gateway
docker-compose logs -f user-service
docker-compose logs -f product-service
docker-compose logs -f order-service
docker-compose logs -f inventory-service
docker-compose logs -f frontend

# Check service status
npm run status

# Rebuild services (if you make changes)
npm run rebuild

# Clean up (remove containers and volumes)
npm run clean
```

### Development Commands
```bash
# Install dependencies for all services
npm run install:all

# Start only infrastructure (for local development)
npm run dev:infrastructure

# Run individual services locally (requires infrastructure running)
npm run dev:api-gateway
npm run dev:user-service
npm run dev:product-service
npm run dev:order-service
npm run dev:inventory-service
npm run dev:frontend
```

## Service Architecture

The application consists of the following services:

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 3000 | Next.js React application |
| **API Gateway** | 8000 | Central routing and authentication |
| **User Service** | 8001 | User management and authentication |
| **Product Service** | 8002 | Product catalog management |
| **Order Service** | 8003 | Order processing (CQRS + Event Sourcing) |
| **Inventory Service** | 8004 | Real-time inventory management |
| **MongoDB** | 27017 | Primary database |
| **RabbitMQ** | 5672/15672 | Message broker |
| **Redis** | 6379 | Cache and sessions |

## Testing the Application

### 1. Register a New User
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in the registration form
4. Login with your new credentials

### 2. Browse Products
1. Navigate to the Products page
2. Search and filter products
3. View product details

### 3. Place an Order
1. Add products to your cart
2. Go to checkout
3. Fill in shipping information
4. Place the order

### 4. Admin Features
1. Login with admin credentials
2. Access admin dashboard
3. Manage products, orders, and inventory

## Troubleshooting

### Services Won't Start
```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000

# Clean up and restart
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
docker-compose build frontend
docker-compose up -d frontend
```

### API Errors
```bash
# Check API Gateway logs
docker-compose logs api-gateway

# Check specific service logs
docker-compose logs user-service
```

## Development Mode

For active development, you can run services locally:

### 1. Start Infrastructure Only
```bash
npm run dev:infrastructure
```

### 2. Run Services Locally
```bash
# In separate terminals
npm run dev:api-gateway
npm run dev:user-service
npm run dev:product-service
npm run dev:order-service
npm run dev:inventory-service
npm run dev:frontend
```

This allows for hot reloading and easier debugging.

## Next Steps

- Explore the **Admin Dashboard** for management features
- Test **Real-time Updates** by placing orders
- Check **RabbitMQ Management** to see message flow
- Review **Service Logs** to understand the architecture
- Customize the application for your needs

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review service-specific documentation in each service folder
- Check Docker logs for troubleshooting: `docker-compose logs -f`

---

**Happy coding with MicroPulse!**
