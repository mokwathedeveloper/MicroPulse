import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { WebSocketMessage, OrderStatusUpdate, InventoryUpdate } from '@/types';
import { toast } from 'react-hot-toast';

interface UseWebSocketOptions {
  onOrderUpdate?: (update: OrderStatusUpdate) => void;
  onInventoryUpdate?: (update: InventoryUpdate) => void;
  onMessage?: (message: WebSocketMessage) => void;
  autoConnect?: boolean;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onOrderUpdate,
    onInventoryUpdate,
    onMessage,
    autoConnect = true,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const { token, user, isAuthenticated } = useAuthStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      const url = token ? `${wsUrl}?token=${token}` : wsUrl;
      
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        
        reconnectAttempts.current = 0;

        // Subscribe to relevant topics
        if (user) {
          subscribe([`user.${user._id}`, 'public.inventory']);
          
          if (user.role === 'admin') {
            subscribe(['admin.orders', 'admin.inventory']);
          }
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({ ...prev, lastMessage: message }));

          // Handle specific message types
          switch (message.type) {
            case 'order_status_update':
              if (onOrderUpdate) {
                onOrderUpdate(message.payload as OrderStatusUpdate);
              }
              
              // Show toast notification for user's orders
              if (user && message.payload.userId === user._id) {
                toast.success(`Order ${message.payload.orderId} status updated to ${message.payload.newStatus}`);
              }
              break;

            case 'inventory_update':
              if (onInventoryUpdate) {
                onInventoryUpdate(message.payload as InventoryUpdate);
              }
              break;

            case 'subscription_confirmed':
              console.log('Subscribed to topics:', message.payload.topics);
              break;

            case 'pong':
              // Handle ping/pong
              break;

            default:
              if (onMessage) {
                onMessage(message);
              }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttempts.current);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false,
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false,
      }));
    }
  }, [token, user, onOrderUpdate, onInventoryUpdate, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
    });
  }, []);

  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type || 'message',
        payload: message.payload || {},
        timestamp: new Date(),
        ...message,
      };
      
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((topics: string[]) => {
    return sendMessage({
      type: 'subscribe',
      payload: { topics },
    });
  }, [sendMessage]);

  const unsubscribe = useCallback((topics: string[]) => {
    return sendMessage({
      type: 'unsubscribe',
      payload: { topics },
    });
  }, [sendMessage]);

  const ping = useCallback(() => {
    return sendMessage({
      type: 'ping',
      payload: {},
    });
  }, [sendMessage]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && token) {
      connect();
    } else if (!isAuthenticated) {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Ping periodically to keep connection alive
  useEffect(() => {
    if (state.isConnected) {
      const pingInterval = setInterval(() => {
        ping();
      }, 30000); // Ping every 30 seconds

      return () => clearInterval(pingInterval);
    }
  }, [state.isConnected, ping]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    ping,
  };
};
