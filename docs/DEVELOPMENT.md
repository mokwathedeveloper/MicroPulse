# MicroPulse Development Guide

This guide covers local development setup, coding standards, and contribution guidelines for MicroPulse.

## Development Environment Setup

### Prerequisites
- **Node.js 18+** with npm
- **Docker Desktop** for infrastructure services
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Docker
  - MongoDB for VS Code

### Local Development Setup

#### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd micropulse

# Install dependencies for all services
npm run install:all
```

#### 2. Start Infrastructure Services
```bash
# Start only database, message queue, and cache
npm run dev:infrastructure

# This starts: MongoDB, RabbitMQ, Redis
```

#### 3. Start Services Individually
```bash
# In separate terminals, start each service
npm run dev:api-gateway
npm run dev:user-service
npm run dev:product-service
npm run dev:order-service
npm run dev:inventory-service
npm run dev:frontend
```

#### 4. Alternative: Use Docker for Some Services
```bash
# Start infrastructure + some services with Docker
docker-compose up -d mongodb rabbitmq redis api-gateway

# Run other services locally for development
npm run dev:user-service
npm run dev:frontend
```

## Project Structure

```
micropulse/
├── services/                    # Backend microservices
│   ├── api-gateway/            # API Gateway service
│   │   ├── src/
│   │   │   ├── routes/         # Route definitions
│   │   │   ├── middleware/     # Custom middleware
│   │   │   ├── websocket/      # WebSocket handlers
│   │   │   └── app.ts          # Express app setup
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── user-service/           # User management service
│   ├── product-service/        # Product catalog service
│   ├── order-service/          # Order processing (CQRS)
│   └── inventory-service/      # Inventory management
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Next.js pages
│   │   ├── store/             # Zustand stores
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility libraries
│   │   └── types/             # TypeScript types
│   └── package.json
├── shared/                     # Shared code
│   ├── types/                 # Common TypeScript types
│   ├── utils/                 # Utility functions
│   └── middleware/            # Shared middleware
├── docs/                      # Documentation
└── docker-compose.yml        # Docker orchestration
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/user-authentication

# Make changes
# ... code changes ...

# Test locally
npm run test
npm run lint

# Commit changes
git add .
git commit -m "feat: add user authentication"

# Push and create PR
git push origin feature/user-authentication
```

### 2. Testing Changes
```bash
# Run tests for all services
npm run test

# Run tests for specific service
cd services/user-service && npm test

# Run frontend tests
cd frontend && npm test

# Run linting
npm run lint
```

### 3. Database Changes
```bash
# Connect to MongoDB for testing
docker exec -it micropulse-mongodb mongosh

# Use the database
use micropulse

# Test queries
db.users.find()
db.products.find()
```

## Service Development

### Adding a New Service

#### 1. Create Service Structure
```bash
mkdir services/new-service
cd services/new-service
npm init -y
```

#### 2. Install Dependencies
```bash
npm install express mongoose joi bcryptjs jsonwebtoken cors helmet
npm install -D @types/node @types/express typescript nodemon ts-node
```

#### 3. Create Basic Structure
```
services/new-service/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── app.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

#### 4. Add to Docker Compose
```yaml
new-service:
  build:
    context: ./services/new-service
    dockerfile: Dockerfile
  container_name: micropulse-new-service
  ports:
    - "8005:8005"
  environment:
    - NODE_ENV=development
    - PORT=8005
  env_file:
    - .env
  depends_on:
    mongodb:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
    redis:
      condition: service_healthy
  volumes:
    - ./services/new-service:/app
    - /app/node_modules
  networks:
    - micropulse-network
  restart: unless-stopped
```

### Service Template

#### Basic Express Service (src/app.ts)
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from '../../../shared/utils/database';
import { setupMessageQueue } from '../../../shared/utils/messageQueue';
import routes from './routes';

const app = express();
const PORT = process.env.NEW_SERVICE_PORT || 8005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'new-service' });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await setupMessageQueue();
    
    app.listen(PORT, () => {
      console.log(`New Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

## Frontend Development

### Component Development

#### 1. Component Structure
```typescript
// components/ProductCard/ProductCard.tsx
import React from 'react';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-gray-600">${product.price}</p>
      <button
        onClick={() => onAddToCart(product._id)}
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add to Cart
      </button>
    </div>
  );
};
```

#### 2. Custom Hooks
```typescript
// hooks/useProducts.ts
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api';

export const useProducts = (filters?: ProductFilters) => {
  return useQuery(
    ['products', filters],
    () => apiClient.products.getAll(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};
```

#### 3. State Management with Zustand
```typescript
// store/productStore.ts
import { create } from 'zustand';
import { Product } from '@/types';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;
}

interface ProductActions {
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProductStore = create<ProductState & ProductActions>((set) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  error: null,
  
  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
```

## Testing

### Backend Testing

#### Unit Tests (Jest)
```typescript
// services/user-service/src/__tests__/userController.test.ts
import request from 'supertest';
import app from '../app';

describe('User Controller', () => {
  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });
  });
});
```

#### Integration Tests
```typescript
// services/user-service/src/__tests__/integration/auth.test.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../app';

describe('Authentication Integration', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should complete full auth flow', async () => {
    // Register user
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

    expect(registerResponse.status).toBe(201);

    // Login user
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.tokens.accessToken).toBeDefined();
  });
});
```

### Frontend Testing

#### Component Tests (Jest + React Testing Library)
```typescript
// frontend/src/components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard/ProductCard';

const mockProduct = {
  _id: '1',
  name: 'Test Product',
  price: 99.99,
  description: 'Test description',
  category: 'test',
  sku: 'TEST001',
  stock: 10,
  images: [],
  isActive: true
};

describe('ProductCard', () => {
  it('renders product information', () => {
    const onAddToCart = jest.fn();
    
    render(
      <ProductCard product={mockProduct} onAddToCart={onAddToCart} />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('calls onAddToCart when button is clicked', () => {
    const onAddToCart = jest.fn();
    
    render(
      <ProductCard product={mockProduct} onAddToCart={onAddToCart} />
    );

    fireEvent.click(screen.getByText('Add to Cart'));
    expect(onAddToCart).toHaveBeenCalledWith('1');
  });
});
```

## Coding Standards

### TypeScript Guidelines

#### 1. Type Definitions
```typescript
// Always define interfaces for props and data structures
interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Use generic types for API responses
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationInfo;
}
```

#### 2. Error Handling
```typescript
// Use custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Consistent error handling in controllers
export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ field: error.field, message: error.message }]
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### Code Formatting

#### ESLint Configuration (.eslintrc.js)
```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

#### Prettier Configuration (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Git Workflow

### Commit Message Convention
```
type(scope): description

feat(auth): add JWT refresh token functionality
fix(orders): resolve order status update bug
docs(api): update authentication endpoints
test(users): add unit tests for user service
refactor(products): optimize product search query
```

### Branch Naming
```
feature/feature-name
bugfix/bug-description
hotfix/critical-fix
release/version-number
```

## Deployment

### Environment Variables
Create environment-specific `.env` files:

#### Development (.env.development)
```env
NODE_ENV=development
MONGODB_URI=mongodb://admin:password123@localhost:27017/micropulse?authSource=admin
JWT_SECRET=dev-secret-key
```

#### Production (.env.production)
```env
NODE_ENV=production
MONGODB_URI=mongodb://username:password@production-host:27017/micropulse
JWT_SECRET=super-secure-production-key
```

### Build Process
```bash
# Build all services
npm run build

# Build specific service
cd services/user-service && npm run build

# Build frontend
cd frontend && npm run build
```

---

This development guide provides the foundation for contributing to MicroPulse. Follow these guidelines to maintain code quality and consistency across the project.
