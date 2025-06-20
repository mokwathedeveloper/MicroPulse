import { CircuitBreakerState } from '../../types';
import { logger } from './logger';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
}

export class CircuitBreaker {
  private state: CircuitBreakerState['state'] = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;
  private options: CircuitBreakerOptions;
  private name: string;

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name;
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod || 10000, // 10 seconds
      expectedErrors: options.expectedErrors || []
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`Circuit breaker ${this.name} reset to CLOSED`);
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    // Check if this is an expected error that shouldn't trigger circuit breaker
    if (this.isExpectedError(error)) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = new Date();

    logger.warn(`Circuit breaker ${this.name} failure ${this.failureCount}/${this.options.failureThreshold}`, {
      error: error.message,
      state: this.state
    });

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
      logger.error(`Circuit breaker ${this.name} opened due to ${this.failureCount} failures`);
    }
  }

  /**
   * Check if error is expected and shouldn't trigger circuit breaker
   */
  private isExpectedError(error: Error): boolean {
    return this.options.expectedErrors!.some(expectedError => 
      error.message.includes(expectedError) || error.name === expectedError
    );
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttempt ? new Date() >= this.nextAttempt : false;
  }

  /**
   * Get current state of the circuit breaker
   */
  public getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;
    logger.info(`Circuit breaker ${this.name} manually reset`);
  }

  /**
   * Check if circuit breaker is healthy
   */
  public isHealthy(): boolean {
    return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
  }
}

/**
 * Retry utility with exponential backoff
 */
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export class RetryHandler {
  private options: RetryOptions;

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxAttempts: options.maxAttempts || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitter: options.jitter !== false,
      retryCondition: options.retryCondition || (() => true)
    };
  }

  /**
   * Execute function with retry logic
   */
  public async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        if (attempt > 1) {
          logger.info(`Retry succeeded on attempt ${attempt}${context ? ` for ${context}` : ''}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (!this.options.retryCondition!(lastError)) {
          throw lastError;
        }

        // Don't wait after the last attempt
        if (attempt === this.options.maxAttempts) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        logger.warn(`Attempt ${attempt} failed${context ? ` for ${context}` : ''}, retrying in ${delay}ms`, {
          error: lastError.message,
          attempt,
          maxAttempts: this.options.maxAttempts
        });

        await this.sleep(delay);
      }
    }

    logger.error(`All ${this.options.maxAttempts} attempts failed${context ? ` for ${context}` : ''}`, {
      error: lastError!.message
    });
    
    throw lastError!;
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number): number {
    let delay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.options.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Combined circuit breaker and retry handler
 */
export class ResilientExecutor {
  private circuitBreaker: CircuitBreaker;
  private retryHandler: RetryHandler;

  constructor(
    name: string,
    circuitBreakerOptions?: Partial<CircuitBreakerOptions>,
    retryOptions?: Partial<RetryOptions>
  ) {
    this.circuitBreaker = new CircuitBreaker(name, circuitBreakerOptions);
    this.retryHandler = new RetryHandler(retryOptions);
  }

  /**
   * Execute function with both circuit breaker and retry protection
   */
  public async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return this.retryHandler.execute(fn, context);
    });
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Check if executor is healthy
   */
  public isHealthy(): boolean {
    return this.circuitBreaker.isHealthy();
  }
}

// Default configurations
export const defaultCircuitBreakerOptions: CircuitBreakerOptions = {
  failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '5'),
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000'),
  monitoringPeriod: 10000,
  expectedErrors: ['ValidationError', 'AuthenticationError', 'AuthorizationError']
};

export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error: Error) => {
    // Don't retry client errors (4xx) but retry server errors (5xx) and network errors
    const nonRetryableErrors = ['ValidationError', 'AuthenticationError', 'AuthorizationError'];
    return !nonRetryableErrors.includes(error.name);
  }
};
