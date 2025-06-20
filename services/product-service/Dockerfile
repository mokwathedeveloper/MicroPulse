# Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create logs and uploads directories
RUN mkdir -p logs uploads

# Expose port
EXPOSE 8002

# Start the application in development mode
CMD ["npm", "run", "dev"]
