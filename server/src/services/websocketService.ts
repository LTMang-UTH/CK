import { io, Socket } from 'socket.io-client';
import { AppConfig } from '../config/appConfig';
import { LocalStorage } from './storage';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private tabId: string;

  constructor() {
    // Generate unique tab ID to ensure each tab has its own connection
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Disconnect WebSocket when tab is closed or page is unloaded
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });

      // Also disconnect on page visibility change (tab switch)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Optional: disconnect when tab is hidden
          // Uncomment if you want to disconnect on tab switch
          // this.disconnect();
        }
      });
    }
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = LocalStorage.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    // Each tab gets its own WebSocket connection
    this.socket = io(`${AppConfig.WS_API_HOST}${AppConfig.WS_NAMESPACE}`, {
      query: { token, tabId: this.tabId },
      transports: ['websocket'],
      forceNew: true, // Force new connection for each tab
    });

    this.socket.on('connect', () => {
      console.log(`WebSocket connected (Tab: ${this.tabId})`);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected (Tab: ${this.tabId}):`, reason);
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error(`WebSocket error (Tab: ${this.tabId}):`, error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getConnectionState(): boolean {
    return this.socket?.connected === true;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn('Socket is not connected. Cannot emit:', event);
      // Try to connect if socket exists but not connected
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }
  }
}

export const websocketService = new WebSocketService();

