#!/bin/bash

# MicroPulse Health Check Script
echo "MicroPulse Health Check"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a service is responding
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $service_name... "
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
        if [ "$response" = "$expected_status" ]; then
            echo -e "${GREEN}OK${NC}"
            return 0
        else
            echo -e "${RED}FAILED (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}SKIPPED (curl not available)${NC}"
        return 2
    fi
}

# Function to check if a port is open
check_port() {
    local service_name=$1
    local host=$2
    local port=$3
    
    echo -n "Checking $service_name port... "
    
    if command -v nc &> /dev/null; then
        if nc -z "$host" "$port" 2>/dev/null; then
            echo -e "${GREEN}OPEN${NC}"
            return 0
        else
            echo -e "${RED}CLOSED${NC}"
            return 1
        fi
    elif command -v telnet &> /dev/null; then
        if timeout 3 telnet "$host" "$port" &>/dev/null; then
            echo -e "${GREEN}OPEN${NC}"
            return 0
        else
            echo -e "${RED}CLOSED${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}SKIPPED (nc/telnet not available)${NC}"
        return 2
    fi
}

# Check Docker services
echo -e "\n${BLUE}Docker Services:${NC}"
if command -v docker &> /dev/null; then
    docker-compose ps
else
    echo -e "${RED}Docker not available${NC}"
fi

# Check service health endpoints
echo -e "\n${BLUE}Service Health Checks:${NC}"
check_service "Frontend" "http://localhost:3000"
check_service "API Gateway" "http://localhost:8000/health"
check_service "User Service" "http://localhost:8001/health"
check_service "Product Service" "http://localhost:8002/health"
check_service "Order Service" "http://localhost:8003/health"
check_service "Inventory Service" "http://localhost:8004/health"

# Check infrastructure ports
echo -e "\n${BLUE}Infrastructure Checks:${NC}"
check_port "MongoDB" "localhost" "27017"
check_port "RabbitMQ" "localhost" "5672"
check_port "RabbitMQ Management" "localhost" "15672"
check_port "Redis" "localhost" "6379"

# Check API endpoints
echo -e "\n${BLUE}API Endpoint Checks:${NC}"
check_service "API Gateway Info" "http://localhost:8000/api/info"
check_service "Products API" "http://localhost:8000/api/products"
check_service "Categories API" "http://localhost:8000/api/products/categories"

echo -e "\n${BLUE}Summary:${NC}"
echo "=========================="
echo "Green: Service is healthy"
echo "Red: Service has issues"
echo "Yellow: Check skipped"
echo ""
echo "If you see red marks, check the logs:"
echo "  docker-compose logs -f [service-name]"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:3000"
echo "  API Gateway: http://localhost:8000"
echo "  RabbitMQ Management: http://localhost:15672"
echo ""
echo "Demo credentials:"
echo "  Admin: admin@micropulse.com / admin123"
echo "  User: user@micropulse.com / user123"
