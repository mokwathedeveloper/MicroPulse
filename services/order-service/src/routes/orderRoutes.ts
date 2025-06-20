import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticate, adminOnly, adminOrModerator } from '../../../../shared/middleware/auth';
import { validateRequest, orderValidationSchemas } from '../../../../shared/utils/src/validation';

export function createOrderRoutes(orderController: OrderController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  // User routes
  router.post('/',
    validateRequest(orderValidationSchemas.create),
    orderController.createOrder
  );

  router.get('/my-orders',
    validateRequest({
      query: require('joi').object({
        page: require('joi').number().integer().min(1).default(1),
        limit: require('joi').number().integer().min(1).max(100).default(10)
      })
    }),
    orderController.getUserOrders
  );

  router.get('/:id',
    validateRequest(orderValidationSchemas.getById),
    orderController.getOrderById
  );

  router.patch('/:id/cancel',
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        reason: require('joi').string().min(5).max(500).required()
      })
    }),
    orderController.cancelOrder
  );

  // Admin/Moderator routes
  router.get('/',
    adminOrModerator,
    validateRequest(orderValidationSchemas.list),
    orderController.getAllOrders
  );

  router.patch('/:id/status',
    adminOrModerator,
    validateRequest(orderValidationSchemas.updateStatus),
    orderController.updateOrderStatus
  );

  router.patch('/:id/payment',
    adminOrModerator,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        paymentStatus: require('joi').string().valid('pending', 'processing', 'completed', 'failed', 'refunded').required(),
        transactionId: require('joi').string().optional(),
        paymentGateway: require('joi').string().optional()
      })
    }),
    orderController.processPayment
  );

  router.patch('/:id/ship',
    adminOrModerator,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        trackingNumber: require('joi').string().required(),
        carrier: require('joi').string().required(),
        estimatedDelivery: require('joi').date().iso().optional()
      })
    }),
    orderController.shipOrder
  );

  // Admin only routes
  router.get('/admin/statistics',
    adminOnly,
    orderController.getOrderStatistics
  );

  router.get('/:id/events',
    adminOnly,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      })
    }),
    orderController.getOrderEvents
  );

  return router;
}

export default createOrderRoutes;
