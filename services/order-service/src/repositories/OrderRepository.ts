import { OrderAggregate } from '../domain/OrderAggregate';
import { EventStore } from '../models/EventStore';
import { Order } from '../models/Order';
import { BaseEvent } from '../../../../shared/types';
import { logger } from '../../../../shared/utils/src/logger';
import { NotFoundError } from '../../../../shared/middleware/errorHandler';
import { withTransaction } from '../../../../shared/utils/src/database';

export class OrderRepository {
  /**
   * Save order aggregate (event sourcing)
   */
  async save(aggregate: OrderAggregate, metadata: any = {}): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();
    
    if (uncommittedEvents.length === 0) {
      return; // Nothing to save
    }

    try {
      await withTransaction(async (session) => {
        // Save events to event store
        for (const event of uncommittedEvents) {
          await (EventStore as any).appendEvent(event, {
            ...metadata,
            session
          });
        }

        // Update read model (projection)
        await this.updateProjection(aggregate, session);
      });

      // Mark events as committed
      aggregate.markEventsAsCommitted();

      logger.info(`Order aggregate saved: ${aggregate.getId()}, version: ${aggregate.getVersion()}`);

    } catch (error) {
      logger.error(`Failed to save order aggregate ${aggregate.getId()}:`, error);
      throw error;
    }
  }

  /**
   * Load order aggregate from event store
   */
  async getById(orderId: string): Promise<OrderAggregate> {
    try {
      const events = await (EventStore as any).getEventsForAggregate(orderId);
      
      if (events.length === 0) {
        throw new NotFoundError(`Order not found: ${orderId}`);
      }

      // Convert event store documents to domain events
      const domainEvents: BaseEvent[] = events.map((eventDoc: any) => ({
        id: eventDoc.eventId,
        type: eventDoc.eventType,
        aggregateId: eventDoc.aggregateId,
        aggregateType: eventDoc.aggregateType,
        version: eventDoc.version,
        timestamp: eventDoc.metadata.timestamp,
        data: eventDoc.eventData
      }));

      const aggregate = OrderAggregate.fromEvents(domainEvents);
      
      logger.debug(`Order aggregate loaded: ${orderId}, version: ${aggregate.getVersion()}`);
      
      return aggregate;

    } catch (error) {
      logger.error(`Failed to load order aggregate ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Check if order exists
   */
  async exists(orderId: string): Promise<boolean> {
    try {
      const count = await EventStore.countDocuments({ aggregateId: orderId });
      return count > 0;
    } catch (error) {
      logger.error(`Failed to check if order exists ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Get order events for debugging/auditing
   */
  async getOrderEvents(orderId: string): Promise<BaseEvent[]> {
    try {
      const events = await (EventStore as any).getEventsForAggregate(orderId);
      
      return events.map((eventDoc: any) => ({
        id: eventDoc.eventId,
        type: eventDoc.eventType,
        aggregateId: eventDoc.aggregateId,
        aggregateType: eventDoc.aggregateType,
        version: eventDoc.version,
        timestamp: eventDoc.metadata.timestamp,
        data: eventDoc.eventData
      }));

    } catch (error) {
      logger.error(`Failed to get order events ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Update read model projection
   */
  private async updateProjection(aggregate: OrderAggregate, session?: any): Promise<void> {
    try {
      const orderId = aggregate.getId();
      
      // Build projection data from aggregate
      const projectionData = {
        _id: orderId,
        userId: aggregate.getUserId(),
        items: aggregate.getItems(),
        totalAmount: aggregate.getTotalAmount(),
        status: aggregate.getStatus(),
        version: aggregate.getVersion(),
        updatedAt: new Date()
      };

      // Get additional data from events for complete projection
      const events = aggregate.getUncommittedEvents();
      
      for (const event of events) {
        switch (event.type) {
          case 'OrderCreated':
            Object.assign(projectionData, {
              shippingAddress: event.data.shippingAddress,
              paymentMethod: event.data.paymentMethod,
              paymentStatus: 'pending'
            });
            break;
            
          case 'OrderPaymentProcessed':
            Object.assign(projectionData, {
              paymentStatus: event.data.paymentStatus,
              ...(event.data.transactionId && {
                'paymentDetails.transactionId': event.data.transactionId
              }),
              ...(event.data.paymentGateway && {
                'paymentDetails.paymentGateway': event.data.paymentGateway
              }),
              ...(event.data.paymentStatus === 'completed' && {
                'paymentDetails.paidAt': new Date()
              })
            });
            break;
            
          case 'OrderShipped':
            Object.assign(projectionData, {
              'shipping.trackingNumber': event.data.trackingNumber,
              'shipping.carrier': event.data.carrier,
              'shipping.shippedAt': event.data.shippedAt,
              ...(event.data.estimatedDelivery && {
                'shipping.estimatedDelivery': event.data.estimatedDelivery
              })
            });
            break;
        }
      }

      // Upsert the projection
      await Order.findByIdAndUpdate(
        orderId,
        { $set: projectionData },
        { 
          upsert: true, 
          new: true, 
          session,
          runValidators: true 
        }
      );

      logger.debug(`Order projection updated: ${orderId}`);

    } catch (error) {
      logger.error(`Failed to update order projection ${aggregate.getId()}:`, error);
      throw error;
    }
  }

  /**
   * Rebuild projection from events (for maintenance)
   */
  async rebuildProjection(orderId: string): Promise<void> {
    try {
      const aggregate = await this.getById(orderId);
      
      await withTransaction(async (session) => {
        await this.updateProjection(aggregate, session);
      });

      logger.info(`Order projection rebuilt: ${orderId}`);

    } catch (error) {
      logger.error(`Failed to rebuild order projection ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get aggregate version (for optimistic concurrency control)
   */
  async getVersion(orderId: string): Promise<number> {
    try {
      const lastEvent = await EventStore.findOne({ aggregateId: orderId })
        .sort({ version: -1 })
        .select('version');
      
      return lastEvent?.version || 0;
    } catch (error) {
      logger.error(`Failed to get order version ${orderId}:`, error);
      throw error;
    }
  }
}

export default OrderRepository;
