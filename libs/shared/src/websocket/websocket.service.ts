import { Injectable } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';

export interface BookingEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  userId: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

@Injectable()
export class WebSocketService {
  constructor(private readonly webSocketGateway: WebSocketGateway) {}

  // Notify user about new booking
  notifyBookingCreated(userId: string, booking: BookingEvent) {
    this.webSocketGateway.emitBookingCreated(userId, booking);
  }

  // Notify user about booking update
  notifyBookingUpdated(userId: string, booking: BookingEvent) {
    this.webSocketGateway.emitBookingUpdated(userId, booking);
  }

  // Notify user about booking reminder
  notifyBookingReminder(userId: string, booking: BookingEvent) {
    this.webSocketGateway.emitBookingReminder(userId, booking);
  }

  // Notify user about booking deletion
  notifyBookingDeleted(userId: string, bookingId: string) {
    this.webSocketGateway.emitBookingDeleted(userId, bookingId);
  }

  // Broadcast system-wide notification
  broadcastSystemNotification(
    message: string,
    type: 'info' | 'warning' | 'error' = 'info',
  ) {
    this.webSocketGateway.broadcast('system.notification', {
      message,
      type,
    });
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connectedClients: this.webSocketGateway.getConnectedClientsCount(),
      timestamp: new Date().toISOString(),
    };
  }
}
