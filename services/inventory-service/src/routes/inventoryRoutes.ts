import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticate, adminOnly, adminOrModerator } from '../../../../shared/middleware/auth';
import { validateRequest, inventoryValidationSchemas } from '../../../../shared/utils/src/validation';

export function createInventoryRoutes(inventoryController: InventoryController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  // Public inventory routes (for checking stock levels)
  router.get('/product/:productId',
    validateRequest(inventoryValidationSchemas.getByProductId),
    inventoryController.getInventoryByProductId
  );

  // Admin/Moderator routes
  router.get('/',
    adminOrModerator,
    validateRequest({
      query: require('joi').object({
        page: require('joi').number().integer().min(1).default(1),
        limit: require('joi').number().integer().min(1).max(100).default(10),
        lowStock: require('joi').string().valid('true', 'false'),
        outOfStock: require('joi').string().valid('true', 'false')
      })
    }),
    inventoryController.getAllInventory
  );

  router.post('/initialize',
    adminOrModerator,
    validateRequest({
      body: require('joi').object({
        productId: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required(),
        initialStock: require('joi').number().integer().min(0).default(0),
        reason: require('joi').string().min(5).max(200).default('Manual initialization')
      })
    }),
    inventoryController.initializeInventory
  );

  router.patch('/update-stock',
    adminOrModerator,
    validateRequest(inventoryValidationSchemas.updateStock),
    inventoryController.updateStock
  );

  router.post('/product/:productId/reserve',
    adminOrModerator,
    validateRequest({
      params: require('joi').object({
        productId: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        quantity: require('joi').number().integer().min(1).required(),
        reason: require('joi').string().min(5).max(200).required(),
        reference: require('joi').string().optional()
      })
    }),
    inventoryController.reserveStock
  );

  router.post('/product/:productId/release',
    adminOrModerator,
    validateRequest({
      params: require('joi').object({
        productId: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        quantity: require('joi').number().integer().min(1).required(),
        reason: require('joi').string().min(5).max(200).required(),
        reference: require('joi').string().optional()
      })
    }),
    inventoryController.releaseStock
  );

  router.get('/low-stock',
    adminOrModerator,
    inventoryController.getLowStockItems
  );

  router.get('/out-of-stock',
    adminOrModerator,
    inventoryController.getOutOfStockItems
  );

  // Admin only routes
  router.get('/statistics',
    adminOnly,
    inventoryController.getInventoryStatistics
  );

  return router;
}

export default createInventoryRoutes;
