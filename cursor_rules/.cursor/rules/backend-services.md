# ⚙️ Backend Microservices Rules

## Structure
- Each service must have:
  - /controllers
  - /routes
  - /models
  - /services
  - /events (publishers and consumers)

## Messaging
- Use Kafka or RabbitMQ for all inter-service communication.
- Events must:
  - Follow naming conventions: e.g., order:created, inventory:updated
  - Have versioned schemas if structure may change
  - Be idempotent: multiple deliveries should have no side effects
  - Be acknowledged or retried on failure

## MongoDB
- Define models in /models/ with clear schemas.
- Use indexes where needed.
- Never hardcode DB connections—read from environment variables.

## Patterns
- Use separation of concerns:
  - Routes for HTTP mapping
  - Controllers for request logic
  - Services for business logic
- Validate incoming requests with middlewares or validators (e.g., express-validator)

## DevOps
- Each service must have a health-check route (e.g., /health).
- Expose metrics if possible (optional for Prometheus/Grafana).
