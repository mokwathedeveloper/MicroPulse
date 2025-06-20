# 🧠 Augment Agent Master Instructions

## General Behavior
- Activate UltraThink Mode before planning or editing.
- Always Plan → Think → Execute → Validate.
- Prioritize DRY (Don't Repeat Yourself) principles.
- Be precise and make minimal impactful changes.
- If a fix or improvement is made, ensure no bugs are introduced.
- All services should be scalable, decoupled, and fault-tolerant.

## Project Scope
- This is a full-stack, event-driven microservices architecture.
- Frontend uses Next.js (React).
- Backend services are built with Node.js and Express.
- MongoDB is used as the primary database.
- Kafka or RabbitMQ is used for inter-service messaging.
- API Gateway exposes unified routes.
- Docker + Docker Compose used for local orchestration.
