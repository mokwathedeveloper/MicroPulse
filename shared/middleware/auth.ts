import { Request, Response, NextFunction } from 'express';
import { jwtService, tokenUtils } from '../utils/src/jwt';
import { JwtPayload, UserRole } from '../types';
import { logger } from '../utils/src/logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      token?: string;
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const token = tokenUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
      return;
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Attach user info to request
    req.user = decoded;
    req.token = token;
    
    logger.debug(`User authenticated: ${decoded.email}`, {
      userId: decoded.userId,
      role: decoded.role
    });
    
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${(error as Error).message}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = tokenUtils.extractTokenFromHeader(authHeader);
      
      if (token) {
        try {
          const decoded = jwtService.verifyAccessToken(token);
          req.user = decoded;
          req.token = token;
        } catch (error) {
          // Token is invalid, but we continue without authentication
          logger.debug(`Optional authentication failed: ${(error as Error).message}`);
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Authorization middleware factory
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.email} with role ${req.user.role} attempted to access resource requiring roles: ${roles.join(', ')}`);
      
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Admin or Moderator middleware
 */
export const adminOrModerator = authorize(UserRole.ADMIN, UserRole.MODERATOR);

/**
 * Resource ownership middleware factory
 */
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Admin can access any resource
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Check if user owns the resource
    const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];
    
    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        message: 'Resource user ID not found'
      });
      return;
    }

    if (req.user.userId !== resourceUserId) {
      logger.warn(`Ownership check failed: User ${req.user.email} attempted to access resource owned by ${resourceUserId}`);
      
      res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own resources'
      });
      return;
    }

    next();
  };
};

/**
 * API Key authentication middleware (for service-to-service communication)
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: 'API key required'
      });
      return;
    }

    // Verify API key
    const decoded = tokenUtils.verifyApiKey(apiKey);
    
    // Attach service info to request
    (req as any).service = decoded.service;
    
    logger.debug(`Service authenticated: ${decoded.service}`);
    
    next();
  } catch (error) {
    logger.warn(`API key authentication failed: ${(error as Error).message}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
};

/**
 * Rate limiting by user
 */
export const rateLimitByUser = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.userId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of userRequests.entries()) {
      if (value.resetTime < windowStart) {
        userRequests.delete(key);
      }
    }

    // Get or create user request info
    let userRequestInfo = userRequests.get(userId);
    if (!userRequestInfo || userRequestInfo.resetTime < windowStart) {
      userRequestInfo = { count: 0, resetTime: now + windowMs };
      userRequests.set(userId, userRequestInfo);
    }

    // Check rate limit
    if (userRequestInfo.count >= maxRequests) {
      const resetTimeSeconds = Math.ceil((userRequestInfo.resetTime - now) / 1000);
      
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: resetTimeSeconds
      });
      return;
    }

    // Increment request count
    userRequestInfo.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - userRequestInfo.count).toString(),
      'X-RateLimit-Reset': Math.ceil(userRequestInfo.resetTime / 1000).toString()
    });

    next();
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  adminOnly,
  adminOrModerator,
  requireOwnership,
  authenticateApiKey,
  rateLimitByUser
};
