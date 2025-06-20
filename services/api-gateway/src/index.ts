import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Server } from 'http';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

// Import shared utilities and middleware
import { logger, DatabaseConnection, EventBus, defaultEventBusConfig, healthChecker, commonHealthChecks } from '../../../shared/utils/src';
import { 
  requestLogger, 
  correlationId, 
  securityHeaders, 
  compression, 
  rateLimiter,
  corsMiddleware,
  healthCheck,
  errorHandler,
  notFoundHandler
} from '../../../shared/middleware';

import { authenticate, optionalAuthenticate, adminOnly } from '../../../shared/middleware/auth';
import { ServiceRegistry } from './services/serviceRegistry';
import { ProxyConfig } from './config/proxyConfig';
import { WebSocketManager } from './services/websocketManager';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

class APIGateway {
  private app: express.Application;
  private server: Server | null = null;
  private wsServer: WebSocket.Server | null = null;
  private serviceRegistry: ServiceRegistry;
  private wsManager: WebSocketManager;
  private eventBus: EventBus;

  constructor() {
    this.app = express();
    this.serviceRegistry = new ServiceRegistry();
    this.wsManager = new WebSocketManager();
    this.eventBus = EventBus.getInstance(defaultEventBusConfig);
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeProxies();
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
    
    // Rate limiting
    this.app.use('/api/', rateLimiter);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', healthCheck);
    
    // API Gateway specific routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/admin', authenticate, adminOnly, adminRoutes);
    
    // Service registry endpoints
    this.app.get('/api/services', authenticate, adminOnly, (req, res) => {
      res.json({
        success: true,
        data: this.serviceRegistry.getAllServices()
      });
    });
    
    // WebSocket info endpoint
    this.app.get('/api/websocket/info', authenticate, (req, res) => {
      res.json({
        success: true,
        data: {
          url: `ws://localhost:${process.env.WS_PORT || 8080}`,
          protocols: ['micropulse-v1']
        }
      });
    });
  }

  private initializeProxies(): void {
    const proxyConfigs = ProxyConfig.getConfigs();
    
    proxyConfigs.forEach(config => {
      logger.info(`Setting up proxy for ${config.path} -> ${config.target}`);
      
      const proxyMiddleware = createProxyMiddleware({
        target: config.target,
        changeOrigin: true,
        pathRewrite: config.pathRewrite,
        timeout: 30000,
        proxyTimeout: 30000,
        
        // Service discovery integration
        router: (req) => {
          const service = this.serviceRegistry.getHealthyService(config.serviceName);
          return service ? service.url : config.target;
        },
        
        // Request/response logging
        onProxyReq: (proxyReq, req, res) => {
          logger.debug(`Proxying request: ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
        },
        
        onProxyRes: (proxyRes, req, res) => {
          logger.debug(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
        },
        
        // Error handling
        onError: (err, req, res) => {
          logger.error(`Proxy error for ${req.method} ${req.url}:`, err);
          
          if (!res.headersSent) {
            res.status(503).json({
              success: false,
              message: 'Service temporarily unavailable'
            });
          }
        }
      });
      
      // Apply authentication middleware if required
      if (config.requireAuth) {
        this.app.use(config.path, authenticate, proxyMiddleware);
      } else if (config.optionalAuth) {
        this.app.use(config.path, optionalAuthenticate, proxyMiddleware);
      } else {
        this.app.use(config.path, proxyMiddleware);
      }
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
    healthChecker.registerCheck('memory', commonHealthChecks.memory(1000)); // 1GB threshold
    
    // Start periodic health checks
    healthChecker.startPeriodicChecks(30000); // Every 30 seconds
  }

  private async initializeWebSocket(): Promise<void> {
    const wsPort = parseInt(process.env.WS_PORT || '8080');
    
    this.wsServer = new WebSocket.Server({ 
      port: wsPort,
      verifyClient: (info) => {
        // Basic verification - in production, you might want to verify JWT tokens
        return true;
      }
    });
    
    this.wsManager.initialize(this.wsServer);
    
    logger.info(`WebSocket server started on port ${wsPort}`);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      const mongoUri = process.env.MONGODB_URI;
      if (mongoUri) {
        await DatabaseConnection.getInstance().connect(mongoUri);
      }
      
      // Connect to event bus
      await this.eventBus.connect();
      
      // Initialize service registry
      await this.serviceRegistry.initialize();
      
      // Start WebSocket server
      await this.initializeWebSocket();
      
      // Start HTTP server
      const port = parseInt(process.env.API_GATEWAY_PORT || '8000');
      
      this.server = this.app.listen(port, () => {
        logger.info(`API Gateway started on port ${port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`WebSocket server: ws://localhost:${process.env.WS_PORT || 8080}`);
      });
      
      // Graceful shutdown handling
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start API Gateway:', error);
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
        
        // Close WebSocket server
        if (this.wsServer) {
          this.wsServer.close();
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

// Start the API Gateway
const gateway = new APIGateway();
gateway.start().catch((error) => {
  logger.error('Failed to start API Gateway:', error);
  process.exit(1);
});

export default APIGateway;
