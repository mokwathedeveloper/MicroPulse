import axios from 'axios';
import { logger } from '../../../../shared/utils/src/logger';

export interface ServiceInstance {
  id: string;
  name: string;
  url: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: Date;
  metadata?: Record<string, any>;
}

export class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly healthCheckIntervalMs: number;

  constructor(healthCheckIntervalMs: number = 30000) {
    this.healthCheckIntervalMs = healthCheckIntervalMs;
  }

  /**
   * Initialize the service registry
   */
  public async initialize(): Promise<void> {
    // Register known services
    this.registerKnownServices();
    
    // Start health checking
    this.startHealthChecking();
    
    logger.info('Service registry initialized');
  }

  /**
   * Register known services from environment variables
   */
  private registerKnownServices(): void {
    const services = [
      {
        name: 'user-service',
        url: process.env.USER_SERVICE_URL || 'http://user-service:8001'
      },
      {
        name: 'product-service',
        url: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8002'
      },
      {
        name: 'order-service',
        url: process.env.ORDER_SERVICE_URL || 'http://order-service:8003'
      },
      {
        name: 'inventory-service',
        url: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8004'
      }
    ];

    services.forEach(service => {
      this.registerService({
        id: `${service.name}-1`,
        name: service.name,
        url: service.url,
        health: 'unknown',
        lastHealthCheck: new Date()
      });
    });
  }

  /**
   * Register a service instance
   */
  public registerService(instance: ServiceInstance): void {
    if (!this.services.has(instance.name)) {
      this.services.set(instance.name, []);
    }

    const instances = this.services.get(instance.name)!;
    const existingIndex = instances.findIndex(i => i.id === instance.id);

    if (existingIndex !== -1) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }

    logger.info(`Service registered: ${instance.name} (${instance.id}) at ${instance.url}`);
  }

  /**
   * Deregister a service instance
   */
  public deregisterService(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) {
      return false;
    }

    const index = instances.findIndex(i => i.id === instanceId);
    if (index !== -1) {
      instances.splice(index, 1);
      logger.info(`Service deregistered: ${serviceName} (${instanceId})`);
      
      // Remove service entry if no instances left
      if (instances.length === 0) {
        this.services.delete(serviceName);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Get all instances of a service
   */
  public getServiceInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * Get a healthy instance of a service (load balancing)
   */
  public getHealthyService(serviceName: string): ServiceInstance | null {
    const instances = this.getServiceInstances(serviceName);
    const healthyInstances = instances.filter(i => i.health === 'healthy');

    if (healthyInstances.length === 0) {
      logger.warn(`No healthy instances found for service: ${serviceName}`);
      return null;
    }

    // Simple round-robin load balancing
    const randomIndex = Math.floor(Math.random() * healthyInstances.length);
    return healthyInstances[randomIndex];
  }

  /**
   * Get all services and their instances
   */
  public getAllServices(): Record<string, ServiceInstance[]> {
    const result: Record<string, ServiceInstance[]> = {};
    
    this.services.forEach((instances, serviceName) => {
      result[serviceName] = instances;
    });

    return result;
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckIntervalMs);

    logger.info(`Health checking started with interval ${this.healthCheckIntervalMs}ms`);
  }

  /**
   * Stop health checking
   */
  public stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health checking stopped');
    }
  }

  /**
   * Perform health checks on all registered services
   */
  private async performHealthChecks(): Promise<void> {
    const promises: Promise<void>[] = [];

    this.services.forEach((instances, serviceName) => {
      instances.forEach(instance => {
        promises.push(this.checkInstanceHealth(instance));
      });
    });

    await Promise.allSettled(promises);
  }

  /**
   * Check health of a specific service instance
   */
  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    try {
      const response = await axios.get(`${instance.url}/health`, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      });

      const wasUnhealthy = instance.health === 'unhealthy';
      instance.health = 'healthy';
      instance.lastHealthCheck = new Date();

      if (wasUnhealthy) {
        logger.info(`Service ${instance.name} (${instance.id}) is now healthy`);
      }

    } catch (error) {
      const wasHealthy = instance.health === 'healthy';
      instance.health = 'unhealthy';
      instance.lastHealthCheck = new Date();

      if (wasHealthy) {
        logger.warn(`Service ${instance.name} (${instance.id}) is now unhealthy: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get service health summary
   */
  public getHealthSummary(): {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    services: Record<string, { healthy: number; unhealthy: number; total: number }>;
  } {
    let totalServices = 0;
    let healthyServices = 0;
    let unhealthyServices = 0;
    const services: Record<string, { healthy: number; unhealthy: number; total: number }> = {};

    this.services.forEach((instances, serviceName) => {
      const healthy = instances.filter(i => i.health === 'healthy').length;
      const unhealthy = instances.filter(i => i.health === 'unhealthy').length;
      const total = instances.length;

      services[serviceName] = { healthy, unhealthy, total };
      
      totalServices += total;
      healthyServices += healthy;
      unhealthyServices += unhealthy;
    });

    return {
      totalServices,
      healthyServices,
      unhealthyServices,
      services
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopHealthChecking();
    this.services.clear();
    logger.info('Service registry cleaned up');
  }
}

export default ServiceRegistry;
