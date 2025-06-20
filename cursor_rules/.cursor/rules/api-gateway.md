# 🌐 API Gateway Rules

## Responsibilities
- Serves as the single entry point for frontend clients.
- Proxies requests to appropriate backend microservices.
- Handles global middleware: auth, rate-limiting, logging, etc.

## Structure
- Must support service routing via:
  - Static config for dev
  - Service discovery (e.g., Consul, etcd) in prod

## Authentication
- Use JWT-based auth middleware.
- Only allow authorized routes through to services.

## Resilience
- Implement circuit breakers (e.g., with resilience4js).
- Add retry logic with exponential backoff for transient failures.
- Gracefully handle service unavailability with fallback responses.

## Security
- Sanitize inputs
- Rate limit requests per IP/user
- Enable CORS configuration for frontend communication
