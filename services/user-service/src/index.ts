import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import shared utilities and middleware
import { 
  logger, 
  DatabaseConnection, 
  EventBus, 
  defaultEventBusConfig,
  healthChecker,
  commonHealthChecks
} from '../../../shared/utils/src';

import {
  requestLogger,
  correlationId,
  securityHeaders,
  compression,
  corsMiddleware,
  healthCheck,
  errorHandler,
  notFoundHandler
} from '../../../shared/middleware';

// Import service components
import { UserService } from './services/userService';
import { UserController } from './controllers/userController';
import { createUserRoutes } from './routes/userRoutes';
import { createAuthRoutes } from './routes/authRoutes';

class UserServiceApp {
  private app: express.Application;
  private server: any = null;
  private eventBus: EventBus;
  private userService: UserService;
  private userController: UserController;

  constructor() {
    this.app = express();
    this.eventBus = EventBus.getInstance(defaultEventBusConfig);
    this.userService = new UserService(this.eventBus);
    this.userController = new UserController(this.userService);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeHealthChecks();
  }

  private initializeMiddleware(): void {
    // Security and CORS
    this.app.use(securityHeaders);
    this.app.use(corsMiddleware);
    
    // Request processing
    this.app.use(compression);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging and correlation
    this.app.use(correlationId);
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', healthCheck);
    
    // API routes
    this.app.use('/api/auth', createAuthRoutes(this.userController));
    this.app.use('/api/users', createUserRoutes(this.userController));
    
    // Service info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        success: true,
        data: {
          service: 'user-service',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  private initializeHealthChecks(): void {
    // Register health checks
    healthChecker.registerCheck('database', commonHealthChecks.database(DatabaseConnection.getInstance()));
    healthChecker.registerCheck('eventBus', commonHealthChecks.rabbitmq(this.eventBus));
    healthChecker.registerCheck('memory', commonHealthChecks.memory(512)); // 512MB threshold
    
    // Start periodic health checks
    healthChecker.startPeriodicChecks(30000); // Every 30 seconds
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
      }
      
      await DatabaseConnection.getInstance().connect(mongoUri);
      
      // Connect to event bus
      await this.eventBus.connect();
      
      // Start HTTP server
      const port = parseInt(process.env.USER_SERVICE_PORT || '8001');
      
      this.server = this.app.listen(port, () => {
        logger.info(`User Service started on port ${port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`Database: Connected to MongoDB`);
        logger.info(`Event Bus: Connected to RabbitMQ`);
      });
      
      // Graceful shutdown handling
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start User Service:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close();
        }
        
        // Stop health checks
        healthChecker.stopPeriodicChecks();
        
        // Disconnect from services
        await this.eventBus.disconnect();
        await DatabaseConnection.getInstance().disconnect();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the User Service
const userService = new UserServiceApp();
userService.start().catch((error) => {
  logger.error('Failed to start User Service:', error);
  process.exit(1);
});

export default UserServiceApp;
