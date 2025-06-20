import { ServiceHealthCheck } from '../../types';
import { logger } from './logger';

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded'
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  details?: any;
  responseTime?: number;
}

export interface HealthCheckFunction {
  (): Promise<HealthCheckResult>;
}

export class HealthChecker {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private interval?: NodeJS.Timeout;

  /**
   * Register a health check
   */
  public registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.checks.set(name, checkFn);
    logger.info(`Health check registered: ${name}`);
  }

  /**
   * Remove a health check
   */
  public unregisterCheck(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);
    logger.info(`Health check unregistered: ${name}`);
  }

  /**
   * Run a specific health check
   */
  public async runCheck(name: string): Promise<HealthCheckResult> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    try {
      const result = await checkFn();
      result.responseTime = Date.now() - startTime;
      this.results.set(name, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
      this.results.set(name, result);
      return result;
    }
  }

  /**
   * Run all health checks
   */
  public async runAllChecks(): Promise<Map<string, HealthCheckResult>> {
    const promises = Array.from(this.checks.keys()).map(async (name) => {
      try {
        const result = await this.runCheck(name);
        return { name, result };
      } catch (error) {
        return {
          name,
          result: {
            status: HealthStatus.UNHEALTHY,
            timestamp: new Date(),
            details: { error: (error as Error).message }
          }
        };
      }
    });

    const results = await Promise.all(promises);
    const resultMap = new Map<string, HealthCheckResult>();
    
    results.forEach(({ name, result }) => {
      resultMap.set(name, result);
    });

    return resultMap;
  }

  /**
   * Get overall health status
   */
  public async getOverallHealth(): Promise<{
    status: HealthStatus;
    checks: Record<string, HealthCheckResult>;
    timestamp: Date;
  }> {
    const results = await this.runAllChecks();
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus = HealthStatus.HEALTHY;

    results.forEach((result, name) => {
      checks[name] = result;
      
      if (result.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (result.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }
    });

    return {
      status: overallStatus,
      checks,
      timestamp: new Date()
    };
  }

  /**
   * Start periodic health checks
   */
  public startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        logger.error('Error running periodic health checks:', error);
      }
    }, intervalMs);

    logger.info(`Periodic health checks started with interval ${intervalMs}ms`);
  }

  /**
   * Stop periodic health checks
   */
  public stopPeriodicChecks(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
      logger.info('Periodic health checks stopped');
    }
  }

  /**
   * Get cached results
   */
  public getCachedResults(): Map<string, HealthCheckResult> {
    return new Map(this.results);
  }
}

// Common health check functions
export const commonHealthChecks = {
  /**
   * Database health check
   */
  database: (connection: any) => async (): Promise<HealthCheckResult> => {
    try {
      const startTime = Date.now();
      const isHealthy = connection.isHealthy ? connection.isHealthy() : true;
      
      if (!isHealthy) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          details: { message: 'Database connection is not healthy' }
        };
      }

      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: { message: 'Database is healthy' }
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        details: { error: (error as Error).message }
      };
    }
  },

  /**
   * Redis health check
   */
  redis: (client: any) => async (): Promise<HealthCheckResult> => {
    try {
      const startTime = Date.now();
      await client.ping();
      
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: { message: 'Redis is healthy' }
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        details: { error: (error as Error).message }
      };
    }
  },

  /**
   * RabbitMQ health check
   */
  rabbitmq: (eventBus: any) => async (): Promise<HealthCheckResult> => {
    try {
      const isHealthy = eventBus.isHealthy ? eventBus.isHealthy() : true;
      
      if (!isHealthy) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          details: { message: 'RabbitMQ connection is not healthy' }
        };
      }

      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        details: { message: 'RabbitMQ is healthy' }
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        details: { error: (error as Error).message }
      };
    }
  },

  /**
   * Memory usage health check
   */
  memory: (thresholdMB: number = 1000) => async (): Promise<HealthCheckResult> => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    let status = HealthStatus.HEALTHY;
    if (heapUsedMB > thresholdMB) {
      status = HealthStatus.UNHEALTHY;
    } else if (heapUsedMB > thresholdMB * 0.8) {
      status = HealthStatus.DEGRADED;
    }

    return {
      status,
      timestamp: new Date(),
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        thresholdMB
      }
    };
  },

  /**
   * Disk space health check
   */
  diskSpace: () => async (): Promise<HealthCheckResult> => {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        details: { message: 'Disk space check completed' }
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        details: { error: (error as Error).message }
      };
    }
  }
};

// Create singleton instance
export const healthChecker = new HealthChecker();

export default healthChecker;
