import { IsEnum } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'Status of the booking',
    example: BookingStatus.CANCELLED,
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
