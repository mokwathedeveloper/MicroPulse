#!/bin/bash

# MicroPulse Setup Script
echo "Setting up MicroPulse E-commerce Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker is installed: $(docker --version)"
    else
        print_error "Docker is not installed!"
        echo "Please install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# Check if Docker Compose is installed
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose is installed: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        print_success "Docker Compose (v2) is installed: $(docker compose version)"
        alias docker-compose='docker compose'
    else
        print_error "Docker Compose is not installed!"
        echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Check if Node.js is installed (for local development)
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js version 18+ is recommended. Current version: $NODE_VERSION"
        fi
    else
        print_warning "Node.js is not installed. It's recommended for local development."
        echo "Install from: https://nodejs.org/"
    fi
}

# Create environment files
create_env_files() {
    print_status "Creating environment files..."
    
    # API Gateway .env
    cat > services/api-gateway/.env << EOF
NODE_ENV=development
API_GATEWAY_PORT=8000
WS_PORT=8080
MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
RABBITMQ_URL=amqp://admin:password123@localhost:5672
REDIS_URL=redis://:password123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
USER_SERVICE_URL=http://localhost:8001
PRODUCT_SERVICE_URL=http://localhost:8002
ORDER_SERVICE_URL=http://localhost:8003
INVENTORY_SERVICE_URL=http://localhost:8004
EOF

    # User Service .env
    cat > services/user-service/.env << EOF
NODE_ENV=development
USER_SERVICE_PORT=8001
MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
RABBITMQ_URL=amqp://admin:password123@localhost:5672
REDIS_URL=redis://:password123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
EOF

    # Product Service .env
    cat > services/product-service/.env << EOF
NODE_ENV=development
PRODUCT_SERVICE_PORT=8002
MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
RABBITMQ_URL=amqp://admin:password123@localhost:5672
REDIS_URL=redis://:password123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EOF

    # Order Service .env
    cat > services/order-service/.env << EOF
NODE_ENV=development
ORDER_SERVICE_PORT=8003
MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
RABBITMQ_URL=amqp://admin:password123@localhost:5672
REDIS_URL=redis://:password123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
USER_SERVICE_URL=http://localhost:8001
PRODUCT_SERVICE_URL=http://localhost:8002
INVENTORY_SERVICE_URL=http://localhost:8004
EOF

    # Inventory Service .env
    cat > services/inventory-service/.env << EOF
NODE_ENV=development
INVENTORY_SERVICE_PORT=8004
MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
RABBITMQ_URL=amqp://admin:password123@localhost:5672
REDIS_URL=redis://:password123@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ORDER_SERVICE_URL=http://localhost:8003
PRODUCT_SERVICE_URL=http://localhost:8002
EOF

    # Frontend .env
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080
EOF

    print_success "Environment files created!"
}

# Main setup function
main() {
    echo "============================================"
    echo "MicroPulse E-commerce Platform Setup"
    echo "============================================"
    echo ""
    
    print_status "Checking prerequisites..."
    check_docker
    check_docker_compose
    check_node
    
    echo ""
    print_status "Setting up project..."
    create_env_files
    
    echo ""
    print_success "Setup completed successfully!"
    echo ""
    echo "============================================"
    echo "Next Steps:"
    echo "============================================"
    echo "1. Start the application:"
    echo "   ${GREEN}docker-compose up -d${NC}"
    echo ""
    echo "2. View logs:"
    echo "   ${GREEN}docker-compose logs -f${NC}"
    echo ""
    echo "3. Access the application:"
    echo "   • Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "   • API Gateway: ${BLUE}http://localhost:8000${NC}"
    echo "   • RabbitMQ Management: ${BLUE}http://localhost:15672${NC} (admin/password123)"
    echo ""
    echo "4. Demo Credentials:"
    echo "   • Admin: admin@micropulse.com / admin123"
    echo "   • User: user@micropulse.com / user123"
    echo ""
    echo "5. Stop the application:"
    echo "   ${GREEN}docker-compose down${NC}"
    echo ""
    echo "============================================"
}

# Run main function
main
