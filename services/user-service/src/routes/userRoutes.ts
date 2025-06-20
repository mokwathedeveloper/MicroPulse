import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize, adminOnly } from '../../../../shared/middleware/auth';
import { validateRequest, userValidationSchemas } from '../../../../shared/utils/src/validation';
import { strictRateLimiter } from '../../../../shared/middleware/common';

export function createUserRoutes(userController: UserController): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.post('/register', 
    strictRateLimiter,
    validateRequest(userValidationSchemas.register),
    userController.register
  );

  router.post('/login',
    strictRateLimiter,
    validateRequest(userValidationSchemas.login),
    userController.login
  );

  // Protected routes (authentication required)
  router.use(authenticate);

  // User profile routes
  router.get('/profile', userController.getProfile);
  
  router.put('/profile',
    validateRequest(userValidationSchemas.updateProfile),
    userController.updateProfile
  );

  router.post('/change-password',
    validateRequest({
      body: require('joi').object({
        currentPassword: require('joi').string().required(),
        newPassword: require('joi').string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
          .message('Password must contain at least 8 characters with uppercase, lowercase, number and special character').required()
      })
    }),
    userController.changePassword
  );

  router.delete('/deactivate', userController.deactivateAccount);

  // User management routes
  router.get('/:id',
    validateRequest(userValidationSchemas.getUserById),
    userController.getUserById
  );

  // Admin only routes
  router.get('/',
    adminOnly,
    userController.getAllUsers
  );

  router.put('/:id/role',
    adminOnly,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        role: require('joi').string().valid('admin', 'user', 'moderator').required()
      })
    }),
    userController.updateUserRole
  );

  router.delete('/:id',
    adminOnly,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      })
    }),
    userController.deactivateUser
  );

  return router;
}

export default createUserRoutes;
