# MicroPulse - Modern E-commerce Microservice Platform

A comprehensive, production-ready e-commerce platform built with modern microservice architecture, featuring Next.js frontend, Node.js backend services, and real-time capabilities.

## Architecture Overview

MicroPulse is built using a microservice architecture with the following components:

### Backend Services
- **API Gateway** (Port 8000) - Central entry point with authentication, routing, and WebSocket support
- **User Service** (Port 8001) - User management, authentication, and profiles
- **Product Service** (Port 8002) - Product catalog, categories, and inventory management
- **Order Service** (Port 8003) - Order processing with CQRS and Event Sourcing
- **Inventory Service** (Port 8004) - Real-time inventory tracking and stock management

### Frontend
- **Next.js Application** (Port 3000) - Modern React-based e-commerce frontend

### Infrastructure
- **MongoDB** (Port 27017) - Primary database for all services
- **RabbitMQ** (Port 5672/15672) - Message broker for inter-service communication
- **Redis** (Port 6379) - Caching and session storage

## Key Features

### Architecture Patterns
- **Microservice Architecture** - Independent, scalable services
- **CQRS & Event Sourcing** - Implemented in Order Service
- **Event-Driven Communication** - RabbitMQ for async messaging
- **Circuit Breaker Pattern** - Fault tolerance and resilience
- **API Gateway Pattern** - Centralized routing and authentication

### Technical Features
- **Real-time Updates** - WebSocket connections for live order/inventory updates
- **JWT Authentication** - Secure token-based authentication with refresh tokens
- **Role-based Access Control** - Admin, moderator, and user roles
- **Comprehensive Validation** - Input validation across all services
- **Health Monitoring** - Built-in health checks and monitoring
- **Graceful Shutdown** - Proper cleanup and resource management

### Business Features
- **User Management** - Registration, login, profile management
- **Product Catalog** - Full CRUD operations, categories, search
- **Shopping Cart** - Persistent cart with real-time updates
- **Order Processing** - Complete order lifecycle with status tracking
- **Inventory Management** - Real-time stock tracking and reservations
- **Admin Dashboard** - Administrative interface for management

## Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for REST APIs
- **MongoDB** with Mongoose ODM
- **RabbitMQ** for messaging
- **Redis** for caching
- **JWT** for authentication
- **WebSocket** for real-time communication

### Frontend
- **Next.js 14** with TypeScript
- **React 18** with hooks
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query** for data fetching
- **React Hook Form** for form handling

### DevOps
- **Docker** & **Docker Compose** for containerization
- **ESLint** & **Prettier** for code quality
- **Jest** for testing (configured)

## Project Structure

```
micropulse/
├── services/
│   ├── api-gateway/          # API Gateway service
│   ├── user-service/         # User management service
│   ├── product-service/      # Product catalog service
│   ├── order-service/        # Order processing service (CQRS)
│   └── inventory-service/    # Inventory management service
├── frontend/                 # Next.js frontend application
├── shared/                   # Shared utilities and types
│   ├── middleware/           # Common middleware
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Shared utilities
├── docker-compose.yml       # Docker orchestration
└── README.md               # This file
```

## Quick Start

### Prerequisites
- **Docker** and **Docker Compose**
- **Node.js 18+** (for local development)
- **Git**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd micropulse
```

### 2. Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **RabbitMQ Management**: http://localhost:15672 (admin/password123)

### 4. Demo Credentials
```
Admin: admin@micropulse.com / admin123
User: user@micropulse.com / user123
```

## Development Setup

### Local Development
```bash
# Install dependencies for all services
npm run install:all

# Start infrastructure only
docker-compose up mongodb rabbitmq redis -d

# Start services individually
cd services/api-gateway && npm run dev
cd services/user-service && npm run dev
cd services/product-service && npm run dev
cd services/order-service && npm run dev
cd services/inventory-service && npm run dev

# Start frontend
cd frontend && npm run dev
```

### Environment Variables
Each service uses environment variables for configuration. See individual service directories for `.env.example` files.

## Service Endpoints

### API Gateway (Port 8000)
- `GET /health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users/profile` - Get user profile
- `GET /api/products` - Get products
- `POST /api/orders` - Create order
- `GET /api/inventory/product/:id` - Get inventory

### WebSocket (Port 8080)
- Real-time order updates
- Inventory change notifications
- Admin notifications

## Testing

```bash
# Run tests for all services
npm run test

# Run tests for specific service
cd services/user-service && npm test

# Run tests with coverage
npm run test:coverage
```

## Monitoring & Health Checks

### Health Endpoints
- API Gateway: `GET /health`
- Each Service: `GET /health`
- Admin Dashboard: `GET /api/admin/health`

### Monitoring Features
- Service health monitoring
- Database connection status
- Message queue status
- Memory usage tracking
- Real-time metrics

## Security Features

- **JWT Authentication** with refresh tokens
- **Password hashing** with bcrypt
- **Input validation** with Joi
- **Rate limiting** on sensitive endpoints
- **CORS protection**
- **Security headers** with Helmet
- **SQL injection protection**
- **XSS protection**

## Event-Driven Architecture

### Event Flow
1. **Order Created** → Inventory reserves stock
2. **Order Shipped** → Inventory commits stock reduction
3. **Order Cancelled** → Inventory releases reserved stock
4. **Product Updated** → Inventory syncs stock levels

### Message Topics
- `user.created` - New user registration
- `order.created` - New order placed
- `order.shipped` - Order shipped
- `inventory.updated` - Stock level changes

## Deployment

### Production Deployment
1. Update environment variables for production
2. Build Docker images
3. Deploy with Docker Compose or Kubernetes
4. Configure load balancer
5. Set up monitoring and logging

### Scaling Considerations
- Each service can be scaled independently
- Use load balancer for API Gateway
- Consider database sharding for high traffic
- Implement caching strategies
- Monitor service performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with modern microservice best practices
- Inspired by real-world e-commerce platforms
- Uses industry-standard technologies and patterns

---

**MicroPulse** - Powering the future of e-commerce with microservice architecture!