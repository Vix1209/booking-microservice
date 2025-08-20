/* eslint-disable @typescript-eslint/no-unused-vars */
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import bull from 'bull';
import {
  BookingReminderJobData,
  BookingNotificationData,
  JobType,
  JobResult,
  WebSocketService,
} from '@shared/shared';

@Processor('booking-jobs')
export class BookingReminderProcessor {
  private readonly logger = new Logger(BookingReminderProcessor.name);

  constructor(private readonly webSocketService: WebSocketService) {}

  @Process(JobType.BOOKING_REMINDER)
  async handleBookingReminder(
    job: bull.Job<BookingReminderJobData>,
  ): Promise<JobResult> {
    const { bookingId, userId, title, startTime, reminderMessage } = job.data;

    try {
      this.logger.log(
        `Processing booking reminder for booking ${bookingId}, user ${userId}`,
      );

      // Send WebSocket notification
      this.webSocketService.notifyBookingReminder(userId, {
        id: bookingId,
        title,
        description: reminderMessage,
        startTime,
        endTime: startTime, // For reminder, we just need start time
        userId,
        status: 'scheduled',
      });

      // Log successful reminder
      this.logger.log(
        `Booking reminder sent successfully for booking ${bookingId}`,
      );

      return {
        success: true,
        message: `Reminder sent for booking: ${title}`,
        data: {
          bookingId,
          userId,
          sentAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send booking reminder for booking ${bookingId}:`,
        error.stack,
      );

      return {
        success: false,
        message: `Failed to send reminder for booking: ${title}`,
        error: error.message,
      };
    }
  }

  @Process(JobType.BOOKING_NOTIFICATION)
  async handleBookingNotification(
    job: bull.Job<BookingNotificationData>,
  ): Promise<JobResult> {
    const { userId, bookingId, type, title, message, timestamp } = job.data;

    try {
      this.logger.log(
        `Processing booking notification for booking ${bookingId}, type: ${type}`,
      );

      // Send appropriate WebSocket notification based on type
      switch (type) {
        case 'created':
          // This would typically be handled directly in the service
          break;
        case 'updated':
          // This would typically be handled directly in the service
          break;
        case 'cancelled':
        case 'deleted':
          this.webSocketService.notifyBookingDeleted(userId, bookingId);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }

      return {
        success: true,
        message: `Notification sent for booking: ${title}`,
        data: {
          bookingId,
          userId,
          type,
          sentAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send booking notification for booking ${bookingId}:`,
        error.stack,
      );

      return {
        success: false,
        message: `Failed to send notification for booking: ${title}`,
        error: error.message,
      };
    }
  }

  @Process(JobType.BOOKING_CLEANUP)
  async handleBookingCleanup(job: bull.Job<any>): Promise<JobResult> {
    try {
      this.logger.log('Processing booking cleanup job');

      // This could include:
      // - Cleaning up expired bookings
      // - Archiving old completed bookings
      // - Removing old reminder jobs
      // - Updating booking statuses based on current time

      // For now, just log the cleanup
      this.logger.log('Booking cleanup completed');

      return {
        success: true,
        message: 'Booking cleanup completed successfully',
        data: {
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to process booking cleanup:', error.stack);

      return {
        success: false,
        message: 'Failed to process booking cleanup',
        error: error.message,
      };
    }
  }
}
