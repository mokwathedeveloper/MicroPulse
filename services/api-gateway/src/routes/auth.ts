import { Router } from 'express';
import { jwtService } from '../../../../shared/utils/src/jwt';
import { logger } from '../../../../shared/utils/src/logger';
import { validateRequest, userValidationSchemas } from '../../../../shared/utils/src/validation';
import { strictRateLimiter } from '../../../../shared/middleware/common';

const router = Router();

/**
 * Token refresh endpoint
 * This is handled at the gateway level for security
 */
router.post('/refresh', strictRateLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);

    // In a real implementation, you would:
    // 1. Check if refresh token exists in database/redis
    // 2. Check if it's not blacklisted
    // 3. Get user details from user service
    
    // For now, we'll create a mock user payload
    // In production, fetch user details from user service
    const userPayload = {
      userId: decoded.userId,
      email: 'user@example.com', // This should come from user service
      role: 'user' as any // This should come from user service
    };

    // Generate new token pair
    const tokens = jwtService.generateTokenPair(userPayload);

    logger.info(`Token refreshed for user: ${decoded.userId}`);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });

  } catch (error) {
    logger.warn(`Token refresh failed: ${(error as Error).message}`);
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

/**
 * Token validation endpoint
 * Useful for other services to validate tokens
 */
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role
        },
        expiresAt: new Date(decoded.exp * 1000)
      }
    });

  } catch (error) {
    res.json({
      success: true,
      data: {
        valid: false,
        error: (error as Error).message
      }
    });
  }
});

/**
 * Logout endpoint
 * Handles token blacklisting at gateway level
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // In a real implementation, you would:
      // 1. Add token to blacklist in Redis
      // 2. Notify user service about logout
      // 3. Clean up any sessions
      
      logger.info('User logged out');
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * Get current user info from token
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required'
      });
    }

    const decoded = jwtService.verifyAccessToken(token);

    res.json({
      success: true,
      data: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tokenExpiresAt: new Date(decoded.exp * 1000)
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

export default router;
