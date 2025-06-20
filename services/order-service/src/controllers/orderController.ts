import { Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { logger } from '../../../../shared/utils/src/logger';
import { ApiResponse } from '../../../../shared/types';
import { asyncHandler } from '../../../../shared/middleware/errorHandler';

export class OrderController {
  private orderService: OrderService;

  constructor(orderService: OrderService) {
    this.orderService = orderService;
  }

  /**
   * Create a new order
   */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const orderData = req.body;

    const result = await this.orderService.createOrder(orderData, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Order created successfully',
      data: result
    };

    res.status(201).json(response);
  });

  /**
   * Get order by ID
   */
  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const order = await this.orderService.getOrderById(id);

    // Users can only access their own orders unless they're admin
    if (order.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: order
    };

    res.json(response);
  });

  /**
   * Get current user's orders
   */
  getUserOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.orderService.getOrdersByUser(userId, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.orders,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Get all orders (admin only)
   */
  getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filters = {
      status: req.query.status as string,
      userId: req.query.userId as string,
      paymentStatus: req.query.paymentStatus as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const result = await this.orderService.getAllOrders(filters, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.orders,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Update order status
   */
  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBy = req.user!.userId;

    await this.orderService.updateOrderStatus(id, status, updatedBy);

    const response: ApiResponse = {
      success: true,
      message: 'Order status updated successfully'
    };

    res.json(response);
  });

  /**
   * Process payment
   */
  processPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentStatus, transactionId, paymentGateway } = req.body;

    await this.orderService.processPayment(id, paymentStatus, transactionId, paymentGateway);

    const response: ApiResponse = {
      success: true,
      message: 'Payment processed successfully'
    };

    res.json(response);
  });

  /**
   * Ship order
   */
  shipOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { trackingNumber, carrier, estimatedDelivery } = req.body;

    await this.orderService.shipOrder(
      id, 
      trackingNumber, 
      carrier, 
      estimatedDelivery ? new Date(estimatedDelivery) : undefined
    );

    const response: ApiResponse = {
      success: true,
      message: 'Order shipped successfully'
    };

    res.json(response);
  });

  /**
   * Cancel order
   */
  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.user!.userId;

    await this.orderService.cancelOrder(id, reason, cancelledBy);

    const response: ApiResponse = {
      success: true,
      message: 'Order cancelled successfully'
    };

    res.json(response);
  });

  /**
   * Get order statistics (admin only)
   */
  getOrderStatistics = asyncHandler(async (req: Request, res: Response) => {
    const statistics = await this.orderService.getOrderStatistics();

    const response: ApiResponse = {
      success: true,
      data: statistics
    };

    res.json(response);
  });

  /**
   * Get order events for auditing (admin only)
   */
  getOrderEvents = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const events = await this.orderService.getOrderEvents(id);

    const response: ApiResponse = {
      success: true,
      data: events
    };

    res.json(response);
  });
}

export default OrderController;
