import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../entities/booking.entity';
import { IsAtLeast15MinFromNow } from 'decorators/startTime.decorator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Title of the booking',
    example: 'Team Meeting',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the booking',
    example: 'Weekly team sync meeting to discuss project progress',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Start time of the booking',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsAtLeast15MinFromNow({
    message: 'Start time must be at least 15 minutes from now',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time of the booking',
    example: '2024-01-15T11:00:00Z',
  })
  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Location of the booking',
    example: 'Conference Room A',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the booking',
    example: 'Please bring your laptops',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
