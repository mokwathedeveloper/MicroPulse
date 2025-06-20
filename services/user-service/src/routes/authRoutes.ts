import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { validateRequest, userValidationSchemas } from '../../../../shared/utils/src/validation';
import { strictRateLimiter } from '../../../../shared/middleware/common';
import { authenticate } from '../../../../shared/middleware/auth';

export function createAuthRoutes(userController: UserController): Router {
  const router = Router();

  // User registration
  router.post('/register',
    strictRateLimiter,
    validateRequest(userValidationSchemas.register),
    userController.register
  );

  // User login
  router.post('/login',
    strictRateLimiter,
    validateRequest(userValidationSchemas.login),
    userController.login
  );

  // Logout (requires authentication)
  router.post('/logout',
    authenticate,
    async (req, res) => {
      // In a real implementation, you would:
      // 1. Add token to blacklist
      // 2. Clear any sessions
      // 3. Log the logout event
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }
  );

  // Refresh token endpoint
  router.post('/refresh',
    async (req, res) => {
      // This is typically handled at the API Gateway level
      // But we can provide a fallback implementation here
      
      res.status(501).json({
        success: false,
        message: 'Token refresh should be handled at API Gateway level'
      });
    }
  );

  // Verify token endpoint (for other services)
  router.post('/verify',
    async (req, res) => {
      try {
        const { token } = req.body;
        
        if (!token) {
          return res.status(400).json({
            success: false,
            message: 'Token is required'
          });
        }

        // Import JWT service
        const { jwtService } = require('../../../../shared/utils/src/jwt');
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
    }
  );

  return router;
}

export default createAuthRoutes;
