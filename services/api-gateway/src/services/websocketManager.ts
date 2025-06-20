import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { jwtService } from '../../../../shared/utils/src/jwt';
import { logger } from '../../../../shared/utils/src/logger';
import { WebSocketMessage, OrderStatusUpdate, InventoryUpdate } from '../../../../shared/types';

export interface WebSocketClient {
  id: string;
  socket: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: Date;
  isAlive: boolean;
}

export class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of client IDs
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket manager
   */
  public initialize(wsServer: WebSocket.Server): void {
    wsServer.on('connection', (socket: WebSocket, request) => {
      this.handleConnection(socket, request);
    });

    // Start ping/pong for connection health
    this.startPingPong();

    logger.info('WebSocket manager initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, request: any): void {
    const clientId = uuidv4();
    const client: WebSocketClient = {
      id: clientId,
      socket,
      subscriptions: new Set(),
      lastPing: new Date(),
      isAlive: true
    };

    this.clients.set(clientId, client);

    // Handle authentication
    this.authenticateClient(client, request);

    // Set up event handlers
    socket.on('message', (data: WebSocket.Data) => {
      this.handleMessage(client, data);
    });

    socket.on('pong', () => {
      client.isAlive = true;
      client.lastPing = new Date();
    });

    socket.on('close', () => {
      this.handleDisconnection(client);
    });

    socket.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(client);
    });

    logger.info(`WebSocket client connected: ${clientId}`);
  }

  /**
   * Authenticate WebSocket client
   */
  private authenticateClient(client: WebSocketClient, request: any): void {
    try {
      // Extract token from query parameters or headers
      const url = new URL(request.url, 'http://localhost');
      const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');

      if (token) {
        const decoded = jwtService.verifyAccessToken(token);
        client.userId = decoded.userId;

        // Track user connections
        if (!this.userConnections.has(decoded.userId)) {
          this.userConnections.set(decoded.userId, new Set());
        }
        this.userConnections.get(decoded.userId)!.add(client.id);

        logger.info(`WebSocket client authenticated: ${client.id} for user ${decoded.userId}`);
      }
    } catch (error) {
      logger.warn(`WebSocket authentication failed for client ${client.id}:`, error);
      // Continue without authentication - some features may be limited
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(client: WebSocketClient, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(client, message.payload);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(client, message.payload);
          break;
        case 'ping':
          this.sendToClient(client.id, { type: 'pong', payload: {}, timestamp: new Date() });
          break;
        default:
          logger.warn(`Unknown WebSocket message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message from client ${client.id}:`, error);
    }
  }

  /**
   * Handle client subscription to topics
   */
  private handleSubscription(client: WebSocketClient, payload: any): void {
    const { topics } = payload;

    if (Array.isArray(topics)) {
      topics.forEach(topic => {
        if (this.isValidSubscription(client, topic)) {
          client.subscriptions.add(topic);
          logger.debug(`Client ${client.id} subscribed to ${topic}`);
        }
      });
    }

    this.sendToClient(client.id, {
      type: 'subscription_confirmed',
      payload: { topics: Array.from(client.subscriptions) },
      timestamp: new Date()
    });
  }

  /**
   * Handle client unsubscription from topics
   */
  private handleUnsubscription(client: WebSocketClient, payload: any): void {
    const { topics } = payload;

    if (Array.isArray(topics)) {
      topics.forEach(topic => {
        client.subscriptions.delete(topic);
        logger.debug(`Client ${client.id} unsubscribed from ${topic}`);
      });
    }

    this.sendToClient(client.id, {
      type: 'unsubscription_confirmed',
      payload: { topics: Array.from(client.subscriptions) },
      timestamp: new Date()
    });
  }

  /**
   * Validate if client can subscribe to a topic
   */
  private isValidSubscription(client: WebSocketClient, topic: string): boolean {
    // Public topics
    if (topic.startsWith('public.')) {
      return true;
    }

    // User-specific topics require authentication
    if (topic.startsWith('user.') && client.userId) {
      const userId = topic.split('.')[1];
      return userId === client.userId;
    }

    // Admin topics require admin role (would need to check user role)
    if (topic.startsWith('admin.')) {
      // For now, just check if user is authenticated
      return !!client.userId;
    }

    return false;
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(client: WebSocketClient): void {
    // Remove from user connections
    if (client.userId) {
      const userClients = this.userConnections.get(client.userId);
      if (userClients) {
        userClients.delete(client.id);
        if (userClients.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }

    // Remove client
    this.clients.delete(client.id);

    logger.info(`WebSocket client disconnected: ${client.id}`);
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Send message to all clients subscribed to a topic
   */
  public broadcastToTopic(topic: string, message: WebSocketMessage): number {
    let sentCount = 0;

    this.clients.forEach(client => {
      if (client.subscriptions.has(topic)) {
        if (this.sendToClient(client.id, message)) {
          sentCount++;
        }
      }
    });

    logger.debug(`Broadcasted message to ${sentCount} clients on topic ${topic}`);
    return sentCount;
  }

  /**
   * Send message to all clients of a specific user
   */
  public sendToUser(userId: string, message: WebSocketMessage): number {
    const userClients = this.userConnections.get(userId);
    if (!userClients) {
      return 0;
    }

    let sentCount = 0;
    userClients.forEach(clientId => {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  /**
   * Broadcast order status update
   */
  public broadcastOrderUpdate(orderUpdate: OrderStatusUpdate): void {
    const message: WebSocketMessage = {
      type: 'order_status_update',
      payload: orderUpdate,
      timestamp: new Date()
    };

    // Send to specific user if order has userId
    if ((orderUpdate as any).userId) {
      this.sendToUser((orderUpdate as any).userId, message);
    }

    // Also broadcast to admin topic
    this.broadcastToTopic('admin.orders', message);
  }

  /**
   * Broadcast inventory update
   */
  public broadcastInventoryUpdate(inventoryUpdate: InventoryUpdate): void {
    const message: WebSocketMessage = {
      type: 'inventory_update',
      payload: inventoryUpdate,
      timestamp: new Date()
    };

    // Broadcast to public inventory topic
    this.broadcastToTopic('public.inventory', message);
  }

  /**
   * Start ping/pong for connection health
   */
  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach(client => {
        if (!client.isAlive) {
          logger.info(`Terminating inactive WebSocket client: ${client.id}`);
          client.socket.terminate();
          this.handleDisconnection(client);
          return;
        }

        client.isAlive = false;
        client.socket.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalClients: number;
    authenticatedClients: number;
    totalSubscriptions: number;
    topicStats: Record<string, number>;
  } {
    let authenticatedClients = 0;
    let totalSubscriptions = 0;
    const topicStats: Record<string, number> = {};

    this.clients.forEach(client => {
      if (client.userId) {
        authenticatedClients++;
      }

      client.subscriptions.forEach(topic => {
        totalSubscriptions++;
        topicStats[topic] = (topicStats[topic] || 0) + 1;
      });
    });

    return {
      totalClients: this.clients.size,
      authenticatedClients,
      totalSubscriptions,
      topicStats
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach(client => {
      client.socket.close();
    });

    this.clients.clear();
    this.userConnections.clear();

    logger.info('WebSocket manager cleaned up');
  }
}

export default WebSocketManager;
