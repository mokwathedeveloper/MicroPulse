#  MicroPulse Troubleshooting Guide

This guide helps you diagnose and resolve common issues when running MicroPulse.

##  Common Issues and Solutions

### 1. Services Won't Start

#### Problem: Docker containers fail to start
```bash
Error: Cannot start service api-gateway: port is already allocated
```

**Solution:**
```bash
# Check what's using the ports
netstat -tulpn | grep :8000
lsof -i :8000  # Mac/Linux

# Kill processes using the ports
sudo kill -9 <process_id>

# Or use different ports in docker-compose.yml
```

#### Problem: Out of memory errors
```bash
Error: Cannot allocate memory
```

**Solution:**
```bash
# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory → 8GB+

# Check current memory usage
docker stats

# Clean up unused containers/images
docker system prune -a
```

### 2. Database Connection Issues

#### Problem: MongoDB connection refused
```bash
MongoNetworkError: failed to connect to server [localhost:27017]
```

**Solution:**
```bash
# Check MongoDB container status
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Verify MongoDB is accessible
docker exec -it micropulse-mongodb mongosh
```

#### Problem: Authentication failed
```bash
MongoServerError: Authentication failed
```

**Solution:**
```bash
# Check environment variables in .env files
# Ensure MONGODB_URI includes correct credentials:
# mongodb://admin:password123@localhost:27017/micropulse?authSource=admin

# Reset MongoDB container
docker-compose down
docker volume rm micropulse_mongodb_data
docker-compose up -d mongodb
```

### 3. RabbitMQ Issues

#### Problem: RabbitMQ connection failed
```bash
Error: ECONNREFUSED 127.0.0.1:5672
```

**Solution:**
```bash
# Check RabbitMQ container
docker-compose ps rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq

# Check RabbitMQ logs
docker-compose logs rabbitmq

# Access RabbitMQ management UI
# http://localhost:15672 (admin/password123)
```

#### Problem: Queue/Exchange not found
```bash
Error: Channel closed by server: 404 (NOT-FOUND)
```

**Solution:**
```bash
# Restart services to recreate queues
docker-compose restart api-gateway user-service product-service order-service inventory-service

# Check RabbitMQ management UI for queues/exchanges
```

### 4. Frontend Issues

#### Problem: Frontend not loading
```bash
Error: Cannot GET /
```

**Solution:**
```bash
# Check frontend container status
docker-compose ps frontend

# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend --no-cache
docker-compose up -d frontend

# Check if Next.js is running
curl http://localhost:3000
```

#### Problem: API calls failing from frontend
```bash
Error: Network Error / CORS Error
```

**Solution:**
```bash
# Check API Gateway is running
curl http://localhost:8000/health

# Verify environment variables in frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Check browser console for detailed errors
```

### 5. Authentication Issues

#### Problem: JWT token invalid
```bash
Error: JsonWebTokenError: invalid token
```

**Solution:**
```bash
# Check JWT_SECRET in all service .env files (must be identical)
# Clear browser localStorage/cookies
# Login again to get fresh tokens

# Test token manually
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/users/profile
```

#### Problem: Login fails
```bash
Error: Invalid credentials
```

**Solution:**
```bash
# Use demo credentials:
# Admin: admin@micropulse.com / admin123
# User: user@micropulse.com / user123

# Check user-service logs
docker-compose logs user-service

# Verify user exists in database
docker exec -it micropulse-mongodb mongosh
use micropulse
db.users.find({email: "admin@micropulse.com"})
```

### 6. Performance Issues

#### Problem: Slow API responses
```bash
Requests taking > 5 seconds
```

**Solution:**
```bash
# Check system resources
docker stats

# Check service logs for errors
docker-compose logs -f

# Restart services
docker-compose restart

# Check database indexes
# MongoDB should have indexes on frequently queried fields
```

#### Problem: High memory usage
```bash
Services consuming too much RAM
```

**Solution:**
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Restart memory-heavy services
docker-compose restart api-gateway

# Increase Docker memory limit
# Docker Desktop → Settings → Resources
```

##  Diagnostic Commands

### Health Check Script
```bash
# Run comprehensive health check
./health-check.sh

# Manual health checks
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

### Service Status
```bash
# Check all services
docker-compose ps

# Check specific service
docker-compose ps api-gateway

# View service logs
docker-compose logs -f api-gateway
docker-compose logs --tail=100 user-service
```

### Network Connectivity
```bash
# Test internal service communication
docker exec -it micropulse-api-gateway curl http://user-service:8001/health

# Test external connectivity
curl http://localhost:8000/api/products
```

### Database Diagnostics
```bash
# Connect to MongoDB
docker exec -it micropulse-mongodb mongosh

# Check database status
use micropulse
db.stats()
show collections

# Check user collection
db.users.countDocuments()
db.products.countDocuments()
```

### Message Queue Diagnostics
```bash
# Access RabbitMQ management
# http://localhost:15672
# Username: admin, Password: password123

# Check queue status via CLI
docker exec -it micropulse-rabbitmq rabbitmqctl list_queues
docker exec -it micropulse-rabbitmq rabbitmqctl list_exchanges
```

##  Clean Up Commands

### Complete Reset
```bash
# Stop all services
docker-compose down

# Remove all volumes (WARNING: This deletes all data)
docker-compose down -v --remove-orphans

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

### Partial Reset
```bash
# Restart specific service
docker-compose restart api-gateway

# Rebuild specific service
docker-compose build api-gateway --no-cache
docker-compose up -d api-gateway

# Reset database only
docker-compose stop mongodb
docker volume rm micropulse_mongodb_data
docker-compose up -d mongodb
```

##  Monitoring and Logs

### Log Analysis
```bash
# View logs with timestamps
docker-compose logs -f -t

# Filter logs by service
docker-compose logs api-gateway | grep ERROR

# Export logs to file
docker-compose logs > micropulse-logs.txt
```

### Resource Monitoring
```bash
# Monitor resource usage
docker stats

# Check disk usage
docker system df

# Monitor specific container
docker stats micropulse-api-gateway
```

##  Getting Help

### Before Asking for Help

1. **Run health check**: `./health-check.sh`
2. **Check logs**: `docker-compose logs -f`
3. **Verify environment**: Check all `.env` files
4. **Test connectivity**: Use curl commands
5. **Check resources**: `docker stats`

### Information to Include

When reporting issues, include:

1. **Error message**: Full error text
2. **Service logs**: Relevant log output
3. **System info**: OS, Docker version
4. **Steps to reproduce**: What you were doing
5. **Environment**: Development/production setup

### Useful Commands for Bug Reports
```bash
# System information
docker --version
docker-compose --version
uname -a

# Service status
docker-compose ps

# Recent logs
docker-compose logs --tail=50

# Resource usage
docker stats --no-stream
```

##  Recovery Procedures

### Service Recovery
```bash
# If a service is stuck
docker-compose restart <service-name>

# If restart doesn't work
docker-compose stop <service-name>
docker-compose rm <service-name>
docker-compose up -d <service-name>
```

### Database Recovery
```bash
# If MongoDB is corrupted
docker-compose stop mongodb
docker volume rm micropulse_mongodb_data
docker-compose up -d mongodb

# Wait for MongoDB to start, then restart services
docker-compose restart api-gateway user-service product-service order-service inventory-service
```

### Complete System Recovery
```bash
# Nuclear option - complete reset
docker-compose down -v --remove-orphans
docker system prune -a
docker-compose up -d
```

---

If you're still experiencing issues after following this guide, please check the [FAQ](FAQ.md) or create an issue in the repository with detailed information about your problem.
