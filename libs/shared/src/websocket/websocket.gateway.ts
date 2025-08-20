/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@WSGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('WebSocketGateway');
  private connectedClients = new Map<string, Socket>();

  constructor(private configService: ConfigService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(client: Socket, userId: string) {
    client.join(`user-${userId}`);
    this.logger.log(`Client ${client.id} joined room: user-${userId}`);
    return { event: 'joined-room', data: `user-${userId}` };
  }

  @SubscribeMessage('leave-user-room')
  handleLeaveUserRoom(client: Socket, userId: string) {
    client.leave(`user-${userId}`);
    this.logger.log(`Client ${client.id} left room: user-${userId}`);
    return { event: 'left-room', data: `user-${userId}` };
  }

  // Emit booking created event
  emitBookingCreated(userId: string, booking: any) {
    this.server.to(`user-${userId}`).emit('booking.created', {
      type: 'booking.created',
      data: booking,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking.created to user-${userId}`);
  }

  // Emit booking updated event
  emitBookingUpdated(userId: string, booking: any) {
    this.server.to(`user-${userId}`).emit('booking.updated', {
      type: 'booking.updated',
      data: booking,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking.updated to user-${userId}`);
  }

  // Emit booking reminder event
  emitBookingReminder(userId: string, booking: any) {
    this.server.to(`user-${userId}`).emit('booking.reminder', {
      type: 'booking.reminder',
      data: {
        ...booking,
        message: `Your booking "${booking.title}" starts in 10 minutes!`,
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking.reminder to user-${userId}`);
  }

  // Emit booking deleted event
  emitBookingDeleted(userId: string, bookingId: string) {
    this.server.to(`user-${userId}`).emit('booking.deleted', {
      type: 'booking.deleted',
      data: { bookingId },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking.deleted to user-${userId}`);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted ${event} to all clients`);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
