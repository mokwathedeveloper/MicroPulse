import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const loggerUtils = {
  // Log with service context
  logWithService: (serviceName: string, level: string, message: string, meta?: any) => {
    logger.log(level, `[${serviceName}] ${message}`, meta);
  },

  // Log API requests
  logApiRequest: (method: string, url: string, statusCode: number, responseTime: number, userId?: string) => {
    logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
      method,
      url,
      statusCode,
      responseTime,
      userId
    });
  },

  // Log errors with stack trace
  logError: (error: Error, context?: string, meta?: any) => {
    logger.error(`${context ? `[${context}] ` : ''}${error.message}`, {
      error: error.message,
      stack: error.stack,
      ...meta
    });
  },

  // Log database operations
  logDbOperation: (operation: string, collection: string, duration: number, success: boolean) => {
    const level = success ? 'debug' : 'error';
    logger.log(level, `DB ${operation} on ${collection} - ${duration}ms`, {
      operation,
      collection,
      duration,
      success
    });
  },

  // Log event publishing/consuming
  logEvent: (eventType: string, action: 'published' | 'consumed', aggregateId: string, success: boolean) => {
    const level = success ? 'info' : 'error';
    logger.log(level, `Event ${eventType} ${action} for ${aggregateId}`, {
      eventType,
      action,
      aggregateId,
      success
    });
  },

  // Log service health checks
  logHealthCheck: (serviceName: string, status: 'healthy' | 'unhealthy', details?: any) => {
    const level = status === 'healthy' ? 'debug' : 'warn';
    logger.log(level, `Health check for ${serviceName}: ${status}`, {
      service: serviceName,
      status,
      details
    });
  }
};

export default logger;
