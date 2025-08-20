import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, Not } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';
import { RedisService, WebSocketService } from '@shared/shared';
import { BookingReminderJobData, JobType } from '@shared/shared';
import { paginate } from 'utils/pagination.utils';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectQueue('booking-jobs')
    private readonly bookingQueue: bull.Queue<BookingReminderJobData>,
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<Booking> {
    // Validate booking times
    const startTime = new Date(createBookingDto.startTime);
    const endTime = new Date(createBookingDto.endTime);
    const now = new Date();

    if (startTime <= now) {
      throw new BadRequestException('Start time must be in the future');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping bookings
    const overlappingBooking = await this.bookingRepository.findOne({
      where: {
        userId,
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
        status: BookingStatus.SCHEDULED,
      },
    });

    if (overlappingBooking) {
      throw new BadRequestException(
        'You have an overlapping booking at this time',
      );
    }

    // Create booking
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      startTime,
      endTime,
      userId,
      status: createBookingDto.status || BookingStatus.SCHEDULED,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Schedule reminder job (10 minutes before start)
    const reminderTime = new Date(startTime.getTime() - 10 * 60 * 1000);
    if (reminderTime > now) {
      const reminderJobData: BookingReminderJobData = {
        bookingId: savedBooking.id,
        userId,
        title: savedBooking.title,
        startTime: savedBooking.startTime,
        reminderMessage: `Your booking "${savedBooking.title}" starts in 10 minutes`,
      };

      await this.bookingQueue.add(JobType.BOOKING_REMINDER, reminderJobData, {
        delay: reminderTime.getTime() - now.getTime(),
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    // Send real-time notification
    this.webSocketService.notifyBookingCreated(userId, {
      id: savedBooking.id,
      title: savedBooking.title,
      description: savedBooking.description,
      startTime: savedBooking.startTime,
      endTime: savedBooking.endTime,
      userId: savedBooking.userId,
      status: savedBooking.status,
    });

    await this.redisService.publishBookingEvent('booking.created', {
      id: savedBooking.id,
      title: savedBooking.title,
      description: savedBooking.description,
      startTime: savedBooking.startTime,
      endTime: savedBooking.endTime,
      userId: savedBooking.userId,
      status: savedBooking.status,
      location: savedBooking.location,
      notes: savedBooking.notes,
    });

    return savedBooking;
  }

  async findAll(userId: string, page: number = 1, limit: number = 10) {
    // Placeholder for pagination - implement as needed
    const [bookings, total] = await this.bookingRepository.findAndCount({
      where: { userId },
      order: { startTime: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      ...paginate(bookings, limit, page, totalPages),
    };
  }

  async findUpcoming(userId: string, limit: number = 10) {
    const now = new Date();
    return this.bookingRepository.find({
      where: {
        userId,
        startTime: MoreThan(now),
        status: BookingStatus.SCHEDULED,
      },
      order: { startTime: 'ASC' },
      take: limit,
    });
  }

  async findPast(userId: string, limit: number = 10) {
    const now = new Date();
    return this.bookingRepository.find({
      where: {
        userId,
        endTime: LessThan(now),
      },
      order: { endTime: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    // Validate new times if provided
    if (updateBookingDto.startTime || updateBookingDto.endTime) {
      const startTime = updateBookingDto.startTime
        ? new Date(updateBookingDto.startTime)
        : booking.startTime;
      const endTime = updateBookingDto.endTime
        ? new Date(updateBookingDto.endTime)
        : booking.endTime;

      if (endTime <= startTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for overlapping bookings (excluding current booking)
      const overlappingBooking = await this.bookingRepository.findOne({
        where: {
          userId,
          id: Not(id),
          startTime: LessThan(endTime),
          endTime: MoreThan(startTime),
          status: BookingStatus.SCHEDULED,
        },
      });

      if (overlappingBooking) {
        throw new BadRequestException(
          'Updated time conflicts with another booking',
        );
      }
    }

    // Update booking
    Object.assign(booking, updateBookingDto);
    if (updateBookingDto.startTime) {
      booking.startTime = new Date(updateBookingDto.startTime);
    }
    if (updateBookingDto.endTime) {
      booking.endTime = new Date(updateBookingDto.endTime);
    }

    const updatedBooking = await this.bookingRepository.save(booking);

    // Send real-time notification
    this.webSocketService.notifyBookingUpdated(userId, {
      id: updatedBooking.id,
      title: updatedBooking.title,
      description: updatedBooking.description,
      startTime: updatedBooking.startTime,
      endTime: updatedBooking.endTime,
      userId: updatedBooking.userId,
      status: updatedBooking.status,
    });

    return updatedBooking;
  }

  async remove(id: string, userId: string): Promise<void> {
    const booking = await this.findOne(id, userId);

    await this.bookingRepository.remove(booking);

    // Send real-time notification
    this.webSocketService.notifyBookingDeleted(userId, id);
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: {
        userId,
        startTime: Between(startDate, endDate),
      },
      order: { startTime: 'ASC' },
    });
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId);
    booking.status = status;
    return this.bookingRepository.save(booking);
  }
}
