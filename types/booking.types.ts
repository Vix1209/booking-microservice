export interface BookingJobData {
  bookingId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  reminderTime: Date;
}

export interface BookingReminderJobData {
  bookingId: string;
  userId: string;
  title: string;
  startTime: Date;
  reminderMessage?: string;
}

export interface BookingNotificationData {
  userId: string;
  bookingId: string;
  type: 'created' | 'updated' | 'reminder' | 'cancelled' | 'deleted';
  title: string;
  message: string;
  timestamp: Date;
}

export enum BookingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  BOOKING_REMINDER = 'booking-reminder',
  BOOKING_NOTIFICATION = 'booking-notification',
  BOOKING_CLEANUP = 'booking-cleanup',
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}
