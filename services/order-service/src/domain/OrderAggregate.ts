import { v4 as uuidv4 } from 'uuid';
import { OrderStatus, OrderItem, Address, BaseEvent } from '../../../../shared/types';
import { createEvent } from '../../../../shared/utils/src/eventBus';

export interface OrderCreatedEvent extends BaseEvent {
  type: 'OrderCreated';
  data: {
    orderId: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: Address;
    paymentMethod: string;
  };
}

export interface OrderStatusUpdatedEvent extends BaseEvent {
  type: 'OrderStatusUpdated';
  data: {
    orderId: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
    updatedBy?: string;
  };
}

export interface OrderPaymentProcessedEvent extends BaseEvent {
  type: 'OrderPaymentProcessed';
  data: {
    orderId: string;
    paymentStatus: string;
    transactionId?: string;
    paymentGateway?: string;
  };
}

export interface OrderShippedEvent extends BaseEvent {
  type: 'OrderShipped';
  data: {
    orderId: string;
    trackingNumber: string;
    carrier: string;
    shippedAt: Date;
    estimatedDelivery?: Date;
  };
}

export interface OrderCancelledEvent extends BaseEvent {
  type: 'OrderCancelled';
  data: {
    orderId: string;
    reason: string;
    cancelledBy?: string;
    refundAmount?: number;
  };
}

export class OrderAggregate {
  private id: string;
  private userId: string;
  private items: OrderItem[];
  private totalAmount: number;
  private status: OrderStatus;
  private shippingAddress: Address;
  private paymentMethod: string;
  private paymentStatus: string;
  private version: number;
  private uncommittedEvents: BaseEvent[];

  constructor(id?: string) {
    this.id = id || uuidv4();
    this.userId = '';
    this.items = [];
    this.totalAmount = 0;
    this.status = OrderStatus.PENDING;
    this.shippingAddress = {} as Address;
    this.paymentMethod = '';
    this.paymentStatus = 'pending';
    this.version = 0;
    this.uncommittedEvents = [];
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getUserId(): string {
    return this.userId;
  }

  public getItems(): OrderItem[] {
    return [...this.items];
  }

  public getTotalAmount(): number {
    return this.totalAmount;
  }

  public getStatus(): OrderStatus {
    return this.status;
  }

  public getVersion(): number {
    return this.version;
  }

  public getUncommittedEvents(): BaseEvent[] {
    return [...this.uncommittedEvents];
  }

  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  // Commands
  public createOrder(
    userId: string,
    items: OrderItem[],
    shippingAddress: Address,
    paymentMethod: string
  ): void {
    if (this.version > 0) {
      throw new Error('Order already exists');
    }

    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

    if (totalAmount <= 0) {
      throw new Error('Order total must be greater than zero');
    }

    const event: OrderCreatedEvent = createEvent(
      'OrderCreated',
      this.id,
      'Order',
      {
        orderId: this.id,
        userId,
        items: [...items],
        totalAmount,
        shippingAddress: { ...shippingAddress },
        paymentMethod
      },
      this.version + 1
    ) as OrderCreatedEvent;

    this.applyEvent(event);
  }

  public updateStatus(newStatus: OrderStatus, updatedBy?: string): void {
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status === newStatus) {
      return; // No change needed
    }

    // Validate status transitions
    if (!this.isValidStatusTransition(this.status, newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }

    const event: OrderStatusUpdatedEvent = createEvent(
      'OrderStatusUpdated',
      this.id,
      'Order',
      {
        orderId: this.id,
        oldStatus: this.status,
        newStatus,
        updatedBy
      },
      this.version + 1
    ) as OrderStatusUpdatedEvent;

    this.applyEvent(event);
  }

  public processPayment(paymentStatus: string, transactionId?: string, paymentGateway?: string): void {
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    const event: OrderPaymentProcessedEvent = createEvent(
      'OrderPaymentProcessed',
      this.id,
      'Order',
      {
        orderId: this.id,
        paymentStatus,
        transactionId,
        paymentGateway
      },
      this.version + 1
    ) as OrderPaymentProcessedEvent;

    this.applyEvent(event);

    // Auto-update order status based on payment
    if (paymentStatus === 'completed' && this.status === OrderStatus.PENDING) {
      this.updateStatus(OrderStatus.CONFIRMED);
    }
  }

  public shipOrder(trackingNumber: string, carrier: string, estimatedDelivery?: Date): void {
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status !== OrderStatus.PROCESSING) {
      throw new Error('Order must be in processing status to ship');
    }

    const event: OrderShippedEvent = createEvent(
      'OrderShipped',
      this.id,
      'Order',
      {
        orderId: this.id,
        trackingNumber,
        carrier,
        shippedAt: new Date(),
        estimatedDelivery
      },
      this.version + 1
    ) as OrderShippedEvent;

    this.applyEvent(event);
    this.updateStatus(OrderStatus.SHIPPED);
  }

  public cancelOrder(reason: string, cancelledBy?: string, refundAmount?: number): void {
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status === OrderStatus.DELIVERED || this.status === OrderStatus.CANCELLED) {
      throw new Error(`Cannot cancel order with status ${this.status}`);
    }

    const event: OrderCancelledEvent = createEvent(
      'OrderCancelled',
      this.id,
      'Order',
      {
        orderId: this.id,
        reason,
        cancelledBy,
        refundAmount
      },
      this.version + 1
    ) as OrderCancelledEvent;

    this.applyEvent(event);
    this.updateStatus(OrderStatus.CANCELLED);
  }

  // Event application
  public applyEvent(event: BaseEvent): void {
    switch (event.type) {
      case 'OrderCreated':
        this.applyOrderCreated(event as OrderCreatedEvent);
        break;
      case 'OrderStatusUpdated':
        this.applyOrderStatusUpdated(event as OrderStatusUpdatedEvent);
        break;
      case 'OrderPaymentProcessed':
        this.applyOrderPaymentProcessed(event as OrderPaymentProcessedEvent);
        break;
      case 'OrderShipped':
        this.applyOrderShipped(event as OrderShippedEvent);
        break;
      case 'OrderCancelled':
        this.applyOrderCancelled(event as OrderCancelledEvent);
        break;
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }

    this.version = event.version;
    this.uncommittedEvents.push(event);
  }

  private applyOrderCreated(event: OrderCreatedEvent): void {
    this.userId = event.data.userId;
    this.items = [...event.data.items];
    this.totalAmount = event.data.totalAmount;
    this.shippingAddress = { ...event.data.shippingAddress };
    this.paymentMethod = event.data.paymentMethod;
    this.status = OrderStatus.PENDING;
  }

  private applyOrderStatusUpdated(event: OrderStatusUpdatedEvent): void {
    this.status = event.data.newStatus;
  }

  private applyOrderPaymentProcessed(event: OrderPaymentProcessedEvent): void {
    this.paymentStatus = event.data.paymentStatus;
  }

  private applyOrderShipped(event: OrderShippedEvent): void {
    // Shipping details would be stored in a separate projection
    // This aggregate focuses on core order state
  }

  private applyOrderCancelled(event: OrderCancelledEvent): void {
    // Cancellation details would be stored in a separate projection
    // This aggregate focuses on core order state
  }

  // Business logic
  private isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // Final state
      [OrderStatus.CANCELLED]: [] // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // Hydration from events
  public static fromEvents(events: BaseEvent[]): OrderAggregate {
    if (events.length === 0) {
      throw new Error('Cannot create aggregate from empty event stream');
    }

    const aggregate = new OrderAggregate(events[0].aggregateId);
    
    events.forEach(event => {
      aggregate.applyEvent(event);
    });
    
    // Clear uncommitted events since these are historical
    aggregate.uncommittedEvents = [];
    
    return aggregate;
  }
}

export default OrderAggregate;
