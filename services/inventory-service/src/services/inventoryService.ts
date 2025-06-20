import { Inventory, InventoryDocument } from '../models/Inventory';
import { InventoryItem, StockUpdateRequest } from '../../../../shared/types';
import { logger } from '../../../../shared/utils/src/logger';
import { NotFoundError, ValidationError, ConflictError } from '../../../../shared/middleware/errorHandler';
import { EventBus, createEvent } from '../../../../shared/utils/src/eventBus';
import { dbUtils, withTransaction } from '../../../../shared/utils/src/database';
import { serviceClients } from '../../../../shared/utils/src/httpClient';

export class InventoryService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize inventory for a new product
   */
  async initializeInventory(productId: string, initialStock: number = 0, reason: string, userId?: string): Promise<InventoryItem> {
    try {
      // Check if inventory already exists
      const existingInventory = await Inventory.findByProductId(productId);
      if (existingInventory) {
        throw new ConflictError('Inventory already exists for this product');
      }

      const inventory = new Inventory({
        productId,
        quantity: initialStock,
        reservedQuantity: 0,
        movements: initialStock > 0 ? [{
          type: 'IN',
          quantity: initialStock,
          reason,
          userId,
          timestamp: new Date()
        }] : []
      });

      await inventory.save();

      // Publish inventory created event
      const inventoryCreatedEvent = createEvent(
        'InventoryCreated',
        productId,
        'Inventory',
        {
          productId,
          initialStock,
          reason,
          userId
        }
      );

      await this.eventBus.publish('micropulse.events', 'inventory.created', inventoryCreatedEvent);

      logger.info(`Inventory initialized for product: ${productId} with stock: ${initialStock}`);

      return this.toInventoryResponse(inventory);

    } catch (error) {
      logger.error(`Failed to initialize inventory for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get inventory by product ID
   */
  async getInventoryByProductId(productId: string): Promise<InventoryItem> {
    try {
      const inventory = await Inventory.findByProductId(productId);
      
      if (!inventory) {
        throw new NotFoundError('Inventory not found for this product');
      }

      return this.toInventoryResponse(inventory);

    } catch (error) {
      logger.error(`Failed to get inventory for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(stockUpdate: StockUpdateRequest, userId?: string): Promise<InventoryItem> {
    try {
      const { productId, quantity, operation } = stockUpdate;
      
      const inventory = await Inventory.findByProductId(productId);
      if (!inventory) {
        throw new NotFoundError('Inventory not found for this product');
      }

      let newQuantity: number;
      let reason: string;

      switch (operation) {
        case 'add':
          newQuantity = inventory.quantity + quantity;
          reason = `Stock addition: +${quantity}`;
          break;
        case 'subtract':
          newQuantity = inventory.quantity - quantity;
          reason = `Stock reduction: -${quantity}`;
          break;
        case 'set':
          newQuantity = quantity;
          reason = `Stock adjustment to ${quantity}`;
          break;
        default:
          throw new ValidationError('Invalid operation. Must be add, subtract, or set');
      }

      if (newQuantity < 0) {
        throw new ValidationError('Stock quantity cannot be negative');
      }

      if (newQuantity < inventory.reservedQuantity) {
        throw new ValidationError('New quantity cannot be less than reserved quantity');
      }

      await inventory.adjust(newQuantity, reason, userId);

      // Sync with product service
      await this.syncWithProductService(productId, newQuantity);

      // Publish inventory updated event
      const inventoryUpdatedEvent = createEvent(
        'InventoryUpdated',
        productId,
        'Inventory',
        {
          productId,
          oldQuantity: inventory.quantity,
          newQuantity,
          operation,
          userId
        }
      );

      await this.eventBus.publish('micropulse.events', 'inventory.updated', inventoryUpdatedEvent);

      logger.info(`Inventory updated for product: ${productId}, operation: ${operation}, quantity: ${quantity}`);

      return this.toInventoryResponse(inventory);

    } catch (error) {
      logger.error(`Failed to update stock for product ${stockUpdate.productId}:`, error);
      throw error;
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(productId: string, quantity: number, reason: string, reference?: string, userId?: string): Promise<void> {
    try {
      const inventory = await Inventory.findByProductId(productId);
      if (!inventory) {
        // Auto-initialize inventory if it doesn't exist
        await this.initializeInventory(productId, 0, 'Auto-initialized for reservation');
        const newInventory = await Inventory.findByProductId(productId);
        if (!newInventory) {
          throw new Error('Failed to initialize inventory');
        }
        
        if (quantity > 0) {
          throw new ValidationError(`Insufficient stock for product ${productId}. Available: 0, Requested: ${quantity}`);
        }
        return;
      }

      if (inventory.availableQuantity < quantity) {
        throw new ValidationError(`Insufficient stock for product ${productId}. Available: ${inventory.availableQuantity}, Requested: ${quantity}`);
      }

      await inventory.reserve(quantity, reason, reference, userId);

      // Publish stock reserved event
      const stockReservedEvent = createEvent(
        'StockReserved',
        productId,
        'Inventory',
        {
          productId,
          quantity,
          reason,
          reference,
          userId,
          availableQuantity: inventory.availableQuantity - quantity
        }
      );

      await this.eventBus.publish('micropulse.events', 'inventory.reserved', stockReservedEvent);

      logger.info(`Stock reserved for product: ${productId}, quantity: ${quantity}, reference: ${reference}`);

    } catch (error) {
      logger.error(`Failed to reserve stock for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Release reserved stock
   */
  async releaseStock(productId: string, quantity: number, reason: string, reference?: string, userId?: string): Promise<void> {
    try {
      const inventory = await Inventory.findByProductId(productId);
      if (!inventory) {
        throw new NotFoundError('Inventory not found for this product');
      }

      await inventory.release(quantity, reason, reference, userId);

      // Publish stock released event
      const stockReleasedEvent = createEvent(
        'StockReleased',
        productId,
        'Inventory',
        {
          productId,
          quantity,
          reason,
          reference,
          userId,
          availableQuantity: inventory.availableQuantity + quantity
        }
      );

      await this.eventBus.publish('micropulse.events', 'inventory.released', stockReleasedEvent);

      logger.info(`Stock released for product: ${productId}, quantity: ${quantity}, reference: ${reference}`);

    } catch (error) {
      logger.error(`Failed to release stock for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Release all reservations for an order
   */
  async releaseOrderReservation(orderId: string, reason: string): Promise<void> {
    try {
      // Get order details from order service
      const orderService = serviceClients.orderService();
      const response = await orderService.get(`/api/orders/${orderId}`);
      const order = response.data.data;

      await withTransaction(async (session) => {
        for (const item of order.items) {
          const inventory = await Inventory.findByProductId(item.productId).session(session);
          if (inventory) {
            // Find the reserved quantity for this order
            const reservedMovement = inventory.movements.find(
              m => m.type === 'RESERVED' && m.reference === orderId
            );
            
            if (reservedMovement) {
              await inventory.release(reservedMovement.quantity, reason, orderId);
            }
          }
        }
      });

      logger.info(`All reservations released for order: ${orderId}`);

    } catch (error) {
      logger.error(`Failed to release order reservation ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Commit order reservation (remove from stock)
   */
  async commitOrderReservation(orderId: string, reason: string): Promise<void> {
    try {
      // Get order details from order service
      const orderService = serviceClients.orderService();
      const response = await orderService.get(`/api/orders/${orderId}`);
      const order = response.data.data;

      await withTransaction(async (session) => {
        for (const item of order.items) {
          const inventory = await Inventory.findByProductId(item.productId).session(session);
          if (inventory) {
            // Release reservation and remove from stock
            await inventory.release(item.quantity, 'Reservation release for order commit', orderId);
            await inventory.removeStock(item.quantity, reason, orderId);
          }
        }
      });

      logger.info(`Order reservation committed for order: ${orderId}`);

    } catch (error) {
      logger.error(`Failed to commit order reservation ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Sync product stock from product service
   */
  async syncProductStock(productId: string, newStock: number, reason: string, userId?: string): Promise<void> {
    try {
      const inventory = await Inventory.findByProductId(productId);
      
      if (!inventory) {
        // Initialize if doesn't exist
        await this.initializeInventory(productId, newStock, reason, userId);
        return;
      }

      await inventory.adjust(newStock, reason, userId);

      logger.info(`Product stock synced for product: ${productId} to ${newStock}`);

    } catch (error) {
      logger.error(`Failed to sync product stock for ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      const items = await (Inventory as any).findLowStock();
      return items.map((item: InventoryDocument) => this.toInventoryResponse(item));
    } catch (error) {
      logger.error('Failed to get low stock items:', error);
      throw error;
    }
  }

  /**
   * Get out of stock items
   */
  async getOutOfStockItems(): Promise<InventoryItem[]> {
    try {
      const items = await (Inventory as any).findOutOfStock();
      return items.map((item: InventoryDocument) => this.toInventoryResponse(item));
    } catch (error) {
      logger.error('Failed to get out of stock items:', error);
      throw error;
    }
  }

  /**
   * Get all inventory items with pagination
   */
  async getAllInventory(page: number = 1, limit: number = 10, filters: any = {}): Promise<{
    items: InventoryItem[];
    pagination: any;
  }> {
    try {
      const { skip, limit: limitNum } = dbUtils.getPaginationOptions(page, limit);
      const query: any = {};

      // Apply filters
      if (filters.lowStock === 'true') {
        query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
      }
      
      if (filters.outOfStock === 'true') {
        query.quantity = 0;
      }

      const [items, total] = await Promise.all([
        Inventory.find(query)
          .sort({ lastUpdated: -1 })
          .skip(skip)
          .limit(limitNum),
        Inventory.countDocuments(query)
      ]);

      return dbUtils.buildPaginationResponse(
        items.map(item => this.toInventoryResponse(item)),
        total,
        page,
        limitNum
      );

    } catch (error) {
      logger.error('Failed to get all inventory:', error);
      throw error;
    }
  }

  /**
   * Sync with product service
   */
  private async syncWithProductService(productId: string, newStock: number): Promise<void> {
    try {
      const productService = serviceClients.productService();
      await productService.patch(`/api/products/${productId}/stock`, {
        stock: newStock
      });
    } catch (error) {
      logger.warn(`Failed to sync with product service for ${productId}:`, error);
      // Don't throw - this is a sync operation that can fail
    }
  }

  /**
   * Convert Inventory document to response format
   */
  private toInventoryResponse(inventory: InventoryDocument): InventoryItem {
    const inventoryObj = inventory.toJSON();
    
    // Add virtual fields
    inventoryObj.availableQuantity = inventory.availableQuantity;
    inventoryObj.isLowStock = inventory.isLowStock;
    inventoryObj.isOutOfStock = inventory.isOutOfStock;
    inventoryObj.needsReorder = inventory.needsReorder;
    
    return inventoryObj;
  }
}

export default InventoryService;
