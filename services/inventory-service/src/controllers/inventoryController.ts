import { Request, Response } from 'express';
import { InventoryService } from '../services/inventoryService';
import { logger } from '../../../../shared/utils/src/logger';
import { ApiResponse } from '../../../../shared/types';
import { asyncHandler } from '../../../../shared/middleware/errorHandler';

export class InventoryController {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  /**
   * Get inventory by product ID
   */
  getInventoryByProductId = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const inventory = await this.inventoryService.getInventoryByProductId(productId);

    const response: ApiResponse = {
      success: true,
      data: inventory
    };

    res.json(response);
  });

  /**
   * Get all inventory items
   */
  getAllInventory = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filters = {
      lowStock: req.query.lowStock as string,
      outOfStock: req.query.outOfStock as string
    };

    const result = await this.inventoryService.getAllInventory(page, limit, filters);

    const response: ApiResponse = {
      success: true,
      data: result.items,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Update stock quantity
   */
  updateStock = asyncHandler(async (req: Request, res: Response) => {
    const { productId, quantity, operation } = req.body;
    const userId = req.user?.userId;

    const inventory = await this.inventoryService.updateStock(
      { productId, quantity, operation },
      userId
    );

    const response: ApiResponse = {
      success: true,
      message: 'Stock updated successfully',
      data: inventory
    };

    res.json(response);
  });

  /**
   * Reserve stock
   */
  reserveStock = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { quantity, reason, reference } = req.body;
    const userId = req.user?.userId;

    await this.inventoryService.reserveStock(productId, quantity, reason, reference, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Stock reserved successfully'
    };

    res.json(response);
  });

  /**
   * Release reserved stock
   */
  releaseStock = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { quantity, reason, reference } = req.body;
    const userId = req.user?.userId;

    await this.inventoryService.releaseStock(productId, quantity, reason, reference, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Stock released successfully'
    };

    res.json(response);
  });

  /**
   * Initialize inventory for a product
   */
  initializeInventory = asyncHandler(async (req: Request, res: Response) => {
    const { productId, initialStock, reason } = req.body;
    const userId = req.user?.userId;

    const inventory = await this.inventoryService.initializeInventory(
      productId,
      initialStock || 0,
      reason || 'Manual initialization',
      userId
    );

    const response: ApiResponse = {
      success: true,
      message: 'Inventory initialized successfully',
      data: inventory
    };

    res.status(201).json(response);
  });

  /**
   * Get low stock items
   */
  getLowStockItems = asyncHandler(async (req: Request, res: Response) => {
    const items = await this.inventoryService.getLowStockItems();

    const response: ApiResponse = {
      success: true,
      data: items
    };

    res.json(response);
  });

  /**
   * Get out of stock items
   */
  getOutOfStockItems = asyncHandler(async (req: Request, res: Response) => {
    const items = await this.inventoryService.getOutOfStockItems();

    const response: ApiResponse = {
      success: true,
      data: items
    };

    res.json(response);
  });

  /**
   * Get inventory statistics
   */
  getInventoryStatistics = asyncHandler(async (req: Request, res: Response) => {
    // This could be expanded with more detailed statistics
    const [lowStockItems, outOfStockItems] = await Promise.all([
      this.inventoryService.getLowStockItems(),
      this.inventoryService.getOutOfStockItems()
    ]);

    const statistics = {
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10), // Top 10
      outOfStockItems: outOfStockItems.slice(0, 10) // Top 10
    };

    const response: ApiResponse = {
      success: true,
      data: statistics
    };

    res.json(response);
  });
}

export default InventoryController;
