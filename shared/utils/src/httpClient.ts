import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ResilientExecutor, defaultCircuitBreakerOptions, defaultRetryOptions } from './circuitBreaker';
import { logger } from './logger';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: boolean;
  circuitBreaker?: boolean;
  serviceName?: string;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private resilientExecutor?: ResilientExecutor;
  private serviceName: string;

  constructor(config: HttpClientConfig) {
    this.serviceName = config.serviceName || 'unknown-service';
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `MicroPulse-HttpClient/${this.serviceName}`,
        ...config.headers
      }
    });

    // Setup resilient executor if enabled
    if (config.retries || config.circuitBreaker) {
      this.resilientExecutor = new ResilientExecutor(
        `http-client-${this.serviceName}`,
        config.circuitBreaker ? defaultCircuitBreakerOptions : undefined,
        config.retries ? defaultRetryOptions : undefined
      );
    }

    // Setup request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`, {
          service: this.serviceName,
          method: config.method,
          url: config.url,
          headers: config.headers
        });
        return config;
      },
      (error) => {
        logger.error(`HTTP Request Error: ${error.message}`, {
          service: this.serviceName,
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Setup response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`HTTP Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          service: this.serviceName,
          status: response.status,
          method: response.config.method,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        const status = error.response?.status || 'unknown';
        const method = error.config?.method?.toUpperCase() || 'unknown';
        const url = error.config?.url || 'unknown';
        
        logger.error(`HTTP Response Error: ${status} ${method} ${url} - ${error.message}`, {
          service: this.serviceName,
          status,
          method,
          url,
          error: error.message,
          response: error.response?.data
        });
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute HTTP request with resilience patterns
   */
  private async executeRequest<T>(requestFn: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
    if (this.resilientExecutor) {
      return this.resilientExecutor.execute(requestFn, `${this.serviceName}-http-request`);
    }
    return requestFn();
  }

  /**
   * GET request
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.get<T>(url, config));
  }

  /**
   * POST request
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.post<T>(url, data, config));
  }

  /**
   * PUT request
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.put<T>(url, data, config));
  }

  /**
   * PATCH request
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.patch<T>(url, data, config));
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.delete<T>(url, config));
  }

  /**
   * HEAD request
   */
  public async head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.head<T>(url, config));
  }

  /**
   * OPTIONS request
   */
  public async options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.options<T>(url, config));
  }

  /**
   * Set authorization header
   */
  public setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authorization header
   */
  public removeAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * Set API key header
   */
  public setApiKey(apiKey: string, headerName: string = 'X-API-Key'): void {
    this.axiosInstance.defaults.headers.common[headerName] = apiKey;
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState() {
    return this.resilientExecutor?.getCircuitBreakerState();
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.resilientExecutor?.resetCircuitBreaker();
  }

  /**
   * Check if client is healthy
   */
  public isHealthy(): boolean {
    return this.resilientExecutor?.isHealthy() ?? true;
  }
}

/**
 * Create HTTP client with default configuration
 */
export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  return new HttpClient({
    timeout: 10000,
    retries: true,
    circuitBreaker: true,
    ...config
  });
};

/**
 * Service-specific HTTP clients
 */
export const serviceClients = {
  userService: () => createHttpClient({
    baseURL: process.env.USER_SERVICE_URL || 'http://user-service:8001',
    serviceName: 'user-service'
  }),

  productService: () => createHttpClient({
    baseURL: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8002',
    serviceName: 'product-service'
  }),

  orderService: () => createHttpClient({
    baseURL: process.env.ORDER_SERVICE_URL || 'http://order-service:8003',
    serviceName: 'order-service'
  }),

  inventoryService: () => createHttpClient({
    baseURL: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8004',
    serviceName: 'inventory-service'
  })
};

export default HttpClient;
