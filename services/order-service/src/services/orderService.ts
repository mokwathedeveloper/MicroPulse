import { OrderAggregate } from '../domain/OrderAggregate';
import { OrderRepository } from '../repositories/OrderRepository';
import { Order } from '../models/Order';
import { OrderCreateRequest, OrderStatus, Order as IOrder } from '../../../../shared/types';
import { logger } from '../../../../shared/utils/src/logger';
import { NotFoundError, ValidationError, ConflictError } from '../../../../shared/middleware/errorHandler';
import { EventBus } from '../../../../shared/utils/src/eventBus';
import { serviceClients } from '../../../../shared/utils/src/httpClient';
import { dbUtils } from '../../../../shared/utils/src/database';

export class OrderService {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(orderRepository: OrderRepository, eventBus: EventBus) {
    this.orderRepository = orderRepository;
    this.eventBus = eventBus;
  }

  /**
   * Create a new order (Command)
   */
  async createOrder(orderData: OrderCreateRequest, userId: string): Promise<{ orderId: string }> {
    try {
      // Validate products and calculate total
      await this.validateOrderItems(orderData.items);

      // Create new order aggregate
      const aggregate = new OrderAggregate();
      
      aggregate.createOrder(
        userId,
        orderData.items,
        orderData.shippingAddress,
        orderData.paymentMethod
      );

      // Save aggregate (this will publish events)
      await this.orderRepository.save(aggregate, {
        userId,
        correlationId: `order-create-${aggregate.getId()}`
      });

      // Publish events to message bus
      const events = aggregate.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish('micropulse.events', `order.${event.type.toLowerCase()}`, event);
      }

      logger.info(`Order created successfully: ${aggregate.getId()} for user ${userId}`);

      return { orderId: aggregate.getId() };

    } catch (error) {
      logger.error('Order creation failed:', error);
      throw error;
    }
  }

  /**
   * Update order status (Command)
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus, updatedBy?: string): Promise<void> {
    try {
      // Load aggregate
      const aggregate = await this.orderRepository.getById(orderId);
      
      // Execute command
      aggregate.updateStatus(newStatus, updatedBy);
      
      // Save aggregate
      await this.orderRepository.save(aggregate, {
        userId: updatedBy,
        correlationId: `order-status-update-${orderId}`
      });

      // Publish events
      const events = aggregate.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish('micropulse.events', `order.${event.type.toLowerCase()}`, event);
      }

      logger.info(`Order status updated: ${orderId} -> ${newStatus}`);

    } catch (error) {
      logger.error(`Failed to update order status ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Process payment (Command)
   */
  async processPayment(orderId: string, paymentStatus: string, transactionId?: string, paymentGateway?: string): Promise<void> {
    try {
      const aggregate = await this.orderRepository.getById(orderId);
      
      aggregate.processPayment(paymentStatus, transactionId, paymentGateway);
      
      await this.orderRepository.save(aggregate, {
        correlationId: `order-payment-${orderId}`
      });

      // Publish events
      const events = aggregate.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish('micropulse.events', `order.${event.type.toLowerCase()}`, event);
      }

      logger.info(`Order payment processed: ${orderId} -> ${paymentStatus}`);

    } catch (error) {
      logger.error(`Failed to process payment for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Ship order (Command)
   */
  async shipOrder(orderId: string, trackingNumber: string, carrier: string, estimatedDelivery?: Date): Promise<void> {
    try {
      const aggregate = await this.orderRepository.getById(orderId);
      
      aggregate.shipOrder(trackingNumber, carrier, estimatedDelivery);
      
      await this.orderRepository.save(aggregate, {
        correlationId: `order-ship-${orderId}`
      });

      // Publish events
      const events = aggregate.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish('micropulse.events', `order.${event.type.toLowerCase()}`, event);
      }

      logger.info(`Order shipped: ${orderId} with tracking ${trackingNumber}`);

    } catch (error) {
      logger.error(`Failed to ship order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel order (Command)
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy?: string): Promise<void> {
    try {
      const aggregate = await this.orderRepository.getById(orderId);
      
      // Calculate refund amount if needed
      const refundAmount = aggregate.getStatus() === OrderStatus.CONFIRMED ? aggregate.getTotalAmount() : undefined;
      
      aggregate.cancelOrder(reason, cancelledBy, refundAmount);
      
      await this.orderRepository.save(aggregate, {
        userId: cancelledBy,
        correlationId: `order-cancel-${orderId}`
      });

      // Publish events
      const events = aggregate.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish('micropulse.events', `order.${event.type.toLowerCase()}`, event);
      }

      logger.info(`Order cancelled: ${orderId} by ${cancelledBy || 'system'}`);

    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

  // Queries (Read side)

  /**
   * Get order by ID (Query)
   */
  async getOrderById(orderId: string): Promise<IOrder> {
    try {
      if (!dbUtils.isValidObjectId(orderId)) {
        throw new ValidationError('Invalid order ID format');
      }

      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      return order.toJSON();

    } catch (error) {
      logger.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get orders by user (Query)
   */
  async getOrdersByUser(userId: string, page: number = 1, limit: number = 10): Promise<{
    orders: IOrder[];
    pagination: any;
  }> {
    try {
      const { skip, limit: limitNum } = dbUtils.getPaginationOptions(page, limit);
      
      const [orders, total] = await Promise.all([
        Order.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Order.countDocuments({ userId })
      ]);

      return dbUtils.buildPaginationResponse(
        orders.map(order => order.toJSON()),
        total,
        page,
        limitNum
      );

    } catch (error) {
      logger.error(`Failed to get orders for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all orders with filtering (Query)
   */
  async getAllOrders(filters: any = {}, page: number = 1, limit: number = 10): Promise<{
    orders: IOrder[];
    pagination: any;
  }> {
    try {
      const { skip, limit: limitNum } = dbUtils.getPaginationOptions(page, limit);
      const query: any = {};

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.userId) {
        query.userId = filters.userId;
      }
      
      if (filters.paymentStatus) {
        query.paymentStatus = filters.paymentStatus;
      }
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Order.countDocuments(query)
      ]);

      return dbUtils.buildPaginationResponse(
        orders.map(order => order.toJSON()),
        total,
        page,
        limitNum
      );

    } catch (error) {
      logger.error('Failed to get all orders:', error);
      throw error;
    }
  }

  /**
   * Get order statistics (Query)
   */
  async getOrderStatistics(): Promise<any> {
    try {
      return await (Order as any).getStatistics();
    } catch (error) {
      logger.error('Failed to get order statistics:', error);
      throw error;
    }
  }

  /**
   * Get order events for auditing (Query)
   */
  async getOrderEvents(orderId: string): Promise<any[]> {
    try {
      return await this.orderRepository.getOrderEvents(orderId);
    } catch (error) {
      logger.error(`Failed to get order events ${orderId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate order items with product service
   */
  private async validateOrderItems(items: any[]): Promise<void> {
    try {
      const productService = serviceClients.productService();
      
      for (const item of items) {
        // Validate product exists and is active
        const response = await productService.get(`/api/products/id/${item.productId}`);
        const product = response.data.data;
        
        if (!product.isActive) {
          throw new ValidationError(`Product ${product.name} is not available`);
        }
        
        if (product.stock < item.quantity) {
          throw new ValidationError(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }
        
        // Validate price (prevent price manipulation)
        if (Math.abs(item.price - product.price) > 0.01) {
          throw new ValidationError(`Price mismatch for product ${product.name}`);
        }
      }

    } catch (error) {
      if (error.response?.status === 404) {
        throw new ValidationError('One or more products not found');
      }
      throw error;
    }
  }
}

export default OrderService;
