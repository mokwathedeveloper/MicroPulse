import amqp, { Connection, Channel, Message } from 'amqplib';
import { BaseEvent } from '../../types';
import { logger, loggerUtils } from './logger';

export interface EventHandler<T extends BaseEvent = BaseEvent> {
  handle(event: T): Promise<void>;
}

export interface EventBusConfig {
  url: string;
  exchanges: {
    name: string;
    type: 'direct' | 'topic' | 'fanout' | 'headers';
    options?: any;
  }[];
  queues: {
    name: string;
    options?: any;
    bindings: {
      exchange: string;
      routingKey: string;
    }[];
  }[];
}

export class EventBus {
  private static instance: EventBus;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnected: boolean = false;
  private handlers: Map<string, EventHandler[]> = new Map();
  private config: EventBusConfig;

  private constructor(config: EventBusConfig) {
    this.config = config;
  }

  public static getInstance(config?: EventBusConfig): EventBus {
    if (!EventBus.instance && config) {
      EventBus.instance = new EventBus(config);
    } else if (!EventBus.instance) {
      throw new Error('EventBus must be initialized with config first');
    }
    return EventBus.instance;
  }

  /**
   * Connect to RabbitMQ
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('EventBus already connected');
        return;
      }

      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Set up error handlers
      this.connection.on('error', (error) => {
        logger.error('RabbitMQ connection error:', error);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
      });

      // Create exchanges
      for (const exchange of this.config.exchanges) {
        await this.channel.assertExchange(exchange.name, exchange.type, exchange.options);
        logger.info(`Exchange '${exchange.name}' created/verified`);
      }

      // Create queues and bindings
      for (const queue of this.config.queues) {
        await this.channel.assertQueue(queue.name, queue.options);
        logger.info(`Queue '${queue.name}' created/verified`);

        // Bind queue to exchanges
        for (const binding of queue.bindings) {
          await this.channel.bindQueue(queue.name, binding.exchange, binding.routingKey);
          logger.info(`Queue '${queue.name}' bound to exchange '${binding.exchange}' with routing key '${binding.routingKey}'`);
        }
      }

      this.isConnected = true;
      logger.info('EventBus connected successfully');

    } catch (error) {
      logger.error('Failed to connect to EventBus:', error);
      throw error;
    }
  }

  /**
   * Disconnect from RabbitMQ
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.isConnected = false;
      logger.info('EventBus disconnected successfully');

    } catch (error) {
      logger.error('Error disconnecting from EventBus:', error);
      throw error;
    }
  }

  /**
   * Publish an event
   */
  public async publish(exchange: string, routingKey: string, event: BaseEvent): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('EventBus not connected');
    }

    try {
      const message = JSON.stringify(event);
      const published = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: event.id,
          type: event.type
        }
      );

      if (!published) {
        throw new Error('Failed to publish event - channel buffer full');
      }

      loggerUtils.logEvent(event.type, 'published', event.aggregateId, true);
      logger.debug(`Event published: ${event.type} to ${exchange}/${routingKey}`);

    } catch (error) {
      loggerUtils.logEvent(event.type, 'published', event.aggregateId, false);
      logger.error(`Failed to publish event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  public async subscribe(queueName: string, eventType: string, handler: EventHandler): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('EventBus not connected');
    }

    // Store handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Set up consumer
    await this.channel.consume(queueName, async (message: Message | null) => {
      if (!message) {
        return;
      }

      try {
        const event: BaseEvent = JSON.parse(message.content.toString());
        
        // Get handlers for this event type
        const eventHandlers = this.handlers.get(event.type) || [];
        
        // Process event with all handlers
        await Promise.all(
          eventHandlers.map(async (eventHandler) => {
            try {
              await eventHandler.handle(event);
              loggerUtils.logEvent(event.type, 'consumed', event.aggregateId, true);
            } catch (handlerError) {
              loggerUtils.logEvent(event.type, 'consumed', event.aggregateId, false);
              logger.error(`Handler error for event ${event.type}:`, handlerError);
              throw handlerError;
            }
          })
        );

        // Acknowledge message
        this.channel!.ack(message);
        logger.debug(`Event consumed: ${event.type} from ${queueName}`);

      } catch (error) {
        logger.error(`Error processing message from ${queueName}:`, error);
        
        // Reject message and requeue (you might want to implement dead letter queue)
        this.channel!.nack(message, false, false);
      }
    });

    logger.info(`Subscribed to events of type '${eventType}' on queue '${queueName}'`);
  }

  /**
   * Check if EventBus is healthy
   */
  public isHealthy(): boolean {
    return this.isConnected && this.connection !== null && this.channel !== null;
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    connectionState: string;
    channelState: string;
  } {
    return {
      connected: this.isConnected,
      connectionState: this.connection ? 'open' : 'closed',
      channelState: this.channel ? 'open' : 'closed'
    };
  }
}

// Default configuration for MicroPulse
export const defaultEventBusConfig: EventBusConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  exchanges: [
    {
      name: 'micropulse.events',
      type: 'topic',
      options: { durable: true }
    },
    {
      name: 'micropulse.commands',
      type: 'direct',
      options: { durable: true }
    }
  ],
  queues: [
    {
      name: 'user.events',
      options: { durable: true },
      bindings: [
        { exchange: 'micropulse.events', routingKey: 'user.*' }
      ]
    },
    {
      name: 'product.events',
      options: { durable: true },
      bindings: [
        { exchange: 'micropulse.events', routingKey: 'product.*' }
      ]
    },
    {
      name: 'order.events',
      options: { durable: true },
      bindings: [
        { exchange: 'micropulse.events', routingKey: 'order.*' }
      ]
    },
    {
      name: 'inventory.events',
      options: { durable: true },
      bindings: [
        { exchange: 'micropulse.events', routingKey: 'inventory.*' }
      ]
    }
  ]
};

// Helper function to create event
export const createEvent = <T extends BaseEvent>(
  type: string,
  aggregateId: string,
  aggregateType: string,
  data: any,
  version: number = 1
): T => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    aggregateId,
    aggregateType,
    version,
    timestamp: new Date(),
    data
  } as T;
};

export default EventBus;
