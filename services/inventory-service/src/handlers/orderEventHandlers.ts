import { EventHandler, BaseEvent } from '../../../../shared/utils/src/eventBus';
import { logger } from '../../../../shared/utils/src/logger';
import { InventoryService } from '../services/inventoryService';

export class OrderCreatedHandler implements EventHandler {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async handle(event: BaseEvent): Promise<void> {
    try {
      logger.info(`Processing OrderCreated event: ${event.id}`);
      
      const { orderId, items } = event.data;
      
      // Reserve inventory for each item in the order
      for (const item of items) {
        await this.inventoryService.reserveStock(
          item.productId,
          item.quantity,
          `Order reservation for order ${orderId}`,
          orderId
        );
      }
      
      logger.info(`Inventory reserved for order: ${orderId}`);
      
    } catch (error) {
      logger.error(`Failed to handle OrderCreated event ${event.id}:`, error);
      throw error;
    }
  }
}

export class OrderCancelledHandler implements EventHandler {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async handle(event: BaseEvent): Promise<void> {
    try {
      logger.info(`Processing OrderCancelled event: ${event.id}`);
      
      const { orderId } = event.data;
      
      // Release reserved inventory for the cancelled order
      await this.inventoryService.releaseOrderReservation(
        orderId,
        'Order cancellation'
      );
      
      logger.info(`Inventory released for cancelled order: ${orderId}`);
      
    } catch (error) {
      logger.error(`Failed to handle OrderCancelled event ${event.id}:`, error);
      throw error;
    }
  }
}

export class OrderShippedHandler implements EventHandler {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async handle(event: BaseEvent): Promise<void> {
    try {
      logger.info(`Processing OrderShipped event: ${event.id}`);
      
      const { orderId } = event.data;
      
      // Commit the inventory reservation (remove from stock)
      await this.inventoryService.commitOrderReservation(
        orderId,
        'Order shipped - stock committed'
      );
      
      logger.info(`Inventory committed for shipped order: ${orderId}`);
      
    } catch (error) {
      logger.error(`Failed to handle OrderShipped event ${event.id}:`, error);
      throw error;
    }
  }
}

export class ProductCreatedHandler implements EventHandler {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async handle(event: BaseEvent): Promise<void> {
    try {
      logger.info(`Processing ProductCreated event: ${event.id}`);
      
      const { productId, stock } = event.data;
      
      // Initialize inventory for the new product
      await this.inventoryService.initializeInventory(
        productId,
        stock || 0,
        'Product creation'
      );
      
      logger.info(`Inventory initialized for product: ${productId}`);
      
    } catch (error) {
      logger.error(`Failed to handle ProductCreated event ${event.id}:`, error);
      throw error;
    }
  }
}

export class ProductStockUpdatedHandler implements EventHandler {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async handle(event: BaseEvent): Promise<void> {
    try {
      logger.info(`Processing ProductStockUpdated event: ${event.id}`);
      
      const { productId, newStock, updatedBy } = event.data;
      
      // Sync inventory with product stock update
      await this.inventoryService.syncProductStock(
        productId,
        newStock,
        'Product stock update sync',
        updatedBy
      );
      
      logger.info(`Inventory synced for product: ${productId}`);
      
    } catch (error) {
      logger.error(`Failed to handle ProductStockUpdated event ${event.id}:`, error);
      throw error;
    }
  }
}
