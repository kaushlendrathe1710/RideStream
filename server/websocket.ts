import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';

interface LocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface WebSocketMessage {
  type: 'driver_location' | 'ride_update' | 'driver_status';
  data: any;
}

class LocationWebSocketServer {
  private wss: WebSocketServer;
  private driverConnections = new Map<string, WebSocket>();
  private rideRooms = new Map<string, Set<WebSocket>>();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
        // In production, add proper authentication here
        return true;
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('WebSocket connection established');
      
      // Parse query parameters for driver/ride identification
      const query = parse(request.url || '', true).query;
      const driverId = query.driverId as string;
      const rideId = query.rideId as string;
      const role = query.role as string; // 'driver' | 'rider' | 'admin'

      // Handle driver connections
      if (role === 'driver' && driverId) {
        this.driverConnections.set(driverId, ws);
        console.log(`Driver ${driverId} connected`);
      }

      // Handle ride room connections
      if (rideId) {
        if (!this.rideRooms.has(rideId)) {
          this.rideRooms.set(rideId, new Set());
        }
        this.rideRooms.get(rideId)?.add(ws);
        console.log(`Client joined ride room ${rideId}`);
      }

      ws.on('message', (message: Buffer) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(message.toString());
          this.handleMessage(ws, parsed, driverId, rideId, role);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        // Clean up connections
        if (driverId) {
          this.driverConnections.delete(driverId);
          console.log(`Driver ${driverId} disconnected`);
        }
        
        if (rideId) {
          this.rideRooms.get(rideId)?.delete(ws);
          if (this.rideRooms.get(rideId)?.size === 0) {
            this.rideRooms.delete(rideId);
          }
          console.log(`Client left ride room ${rideId}`);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send initial connection confirmation
      this.sendMessage(ws, {
        type: 'connection',
        data: { status: 'connected', role, driverId, rideId }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage, driverId?: string, rideId?: string, role?: string) {
    switch (message.type) {
      case 'driver_location':
        if (role === 'driver' && driverId) {
          this.broadcastDriverLocation(driverId, message.data);
        }
        break;
        
      case 'driver_status':
        if (role === 'driver' && driverId) {
          this.broadcastDriverStatus(driverId, message.data);
        }
        break;
        
      case 'ride_update':
        if (rideId) {
          this.broadcastToRideRoom(rideId, message);
        }
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastDriverLocation(driverId: string, locationData: LocationUpdate) {
    // Broadcast to all admin connections and active rides involving this driver
    const message = {
      type: 'driver_location_update',
      data: {
        driverId,
        ...locationData,
        timestamp: Date.now()
      }
    };

    // Broadcast to all ride rooms (for tracking during trips)
    this.rideRooms.forEach((clients, rideId) => {
      clients.forEach(client => {
        this.sendMessage(client, message);
      });
    });
  }

  private broadcastDriverStatus(driverId: string, statusData: any) {
    const message = {
      type: 'driver_status_update',
      data: {
        driverId,
        ...statusData,
        timestamp: Date.now()
      }
    };

    // Broadcast to admin clients and relevant ride rooms
    this.rideRooms.forEach((clients) => {
      clients.forEach(client => {
        this.sendMessage(client, message);
      });
    });
  }

  private broadcastToRideRoom(rideId: string, message: WebSocketMessage) {
    const clients = this.rideRooms.get(rideId);
    if (clients) {
      const broadcastMessage = {
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      
      clients.forEach(client => {
        this.sendMessage(client, broadcastMessage);
      });
    }
  }

  // Public methods for server-side broadcasting
  public notifyRideUpdate(rideId: string, rideData: any) {
    this.broadcastToRideRoom(rideId, {
      type: 'ride_update',
      data: rideData
    });
  }

  public notifyDriverLocationUpdate(driverIdParam: string, locationData: LocationUpdate) {
    this.broadcastDriverLocation(driverIdParam, locationData);
  }

  public getConnectedDrivers(): string[] {
    return Array.from(this.driverConnections.keys());
  }

  public getActiveRideRooms(): string[] {
    return Array.from(this.rideRooms.keys());
  }
}

export default LocationWebSocketServer;