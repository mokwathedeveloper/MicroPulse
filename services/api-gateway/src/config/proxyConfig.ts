export interface ProxyRoute {
  path: string;
  target: string;
  serviceName: string;
  requireAuth: boolean;
  optionalAuth: boolean;
  pathRewrite?: { [key: string]: string };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export class ProxyConfig {
  private static configs: ProxyRoute[] = [
    // User Service Routes
    {
      path: '/api/users',
      target: process.env.USER_SERVICE_URL || 'http://user-service:8001',
      serviceName: 'user-service',
      requireAuth: true,
      optionalAuth: false,
      pathRewrite: {
        '^/api/users': '/api/users'
      }
    },
    {
      path: '/api/auth/register',
      target: process.env.USER_SERVICE_URL || 'http://user-service:8001',
      serviceName: 'user-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/auth': '/api/auth'
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5 // 5 registration attempts per 15 minutes
      }
    },
    {
      path: '/api/auth/login',
      target: process.env.USER_SERVICE_URL || 'http://user-service:8001',
      serviceName: 'user-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/auth': '/api/auth'
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10 // 10 login attempts per 15 minutes
      }
    },
    {
      path: '/api/auth/refresh',
      target: process.env.USER_SERVICE_URL || 'http://user-service:8001',
      serviceName: 'user-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/auth': '/api/auth'
      }
    },
    {
      path: '/api/auth/logout',
      target: process.env.USER_SERVICE_URL || 'http://user-service:8001',
      serviceName: 'user-service',
      requireAuth: true,
      optionalAuth: false,
      pathRewrite: {
        '^/api/auth': '/api/auth'
      }
    },

    // Product Service Routes
    {
      path: '/api/products',
      target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8002',
      serviceName: 'product-service',
      requireAuth: false,
      optionalAuth: true, // Optional auth for personalized product recommendations
      pathRewrite: {
        '^/api/products': '/api/products'
      }
    },

    // Order Service Routes
    {
      path: '/api/orders',
      target: process.env.ORDER_SERVICE_URL || 'http://order-service:8003',
      serviceName: 'order-service',
      requireAuth: true,
      optionalAuth: false,
      pathRewrite: {
        '^/api/orders': '/api/orders'
      }
    },

    // Inventory Service Routes
    {
      path: '/api/inventory',
      target: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8004',
      serviceName: 'inventory-service',
      requireAuth: true,
      optionalAuth: false,
      pathRewrite: {
        '^/api/inventory': '/api/inventory'
      }
    },

    // Health check routes for services
    {
      path: '/api/health/user-service',
      target: process.env.USER_SERVICE_URL || 'http://user-service:8001',
      serviceName: 'user-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/health/user-service': '/health'
      }
    },
    {
      path: '/api/health/product-service',
      target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8002',
      serviceName: 'product-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/health/product-service': '/health'
      }
    },
    {
      path: '/api/health/order-service',
      target: process.env.ORDER_SERVICE_URL || 'http://order-service:8003',
      serviceName: 'order-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/health/order-service': '/health'
      }
    },
    {
      path: '/api/health/inventory-service',
      target: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8004',
      serviceName: 'inventory-service',
      requireAuth: false,
      optionalAuth: false,
      pathRewrite: {
        '^/api/health/inventory-service': '/health'
      }
    }
  ];

  public static getConfigs(): ProxyRoute[] {
    return this.configs;
  }

  public static getConfigByPath(path: string): ProxyRoute | undefined {
    return this.configs.find(config => path.startsWith(config.path));
  }

  public static getConfigsByService(serviceName: string): ProxyRoute[] {
    return this.configs.filter(config => config.serviceName === serviceName);
  }

  public static addConfig(config: ProxyRoute): void {
    this.configs.push(config);
  }

  public static removeConfig(path: string): boolean {
    const index = this.configs.findIndex(config => config.path === path);
    if (index !== -1) {
      this.configs.splice(index, 1);
      return true;
    }
    return false;
  }

  public static updateConfig(path: string, updates: Partial<ProxyRoute>): boolean {
    const config = this.configs.find(config => config.path === path);
    if (config) {
      Object.assign(config, updates);
      return true;
    }
    return false;
  }
}

export default ProxyConfig;
