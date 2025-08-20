import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtGuard } from '../authentication/auth/guard/jwt.guard';
import { Booking } from './entities/booking.entity';
import {
  CreateBookingDocs,
  DeleteSingleBookingDocs,
  FindBookingDocs,
  FindPastBookingDocs,
  FindSingleBookingDocs,
  FindUpcomingBookingDocs,
  UpdateBookingStatusDocs,
  UpdateSingleBookingDocs,
} from './docs/booking.docs';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('Bookings')
@ApiBearerAuth('JWT')
@UseGuards(JwtGuard)
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @CreateBookingDocs()
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req: any,
  ): Promise<Booking> {
    return this.bookingService.create(createBookingDto, req.user.id);
  }

  @Get()
  @FindBookingDocs()
  async findAll(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.bookingService.findAll(req.user.id, page, limit);
  }

  @Get('upcoming')
  @FindUpcomingBookingDocs()
  async findUpcoming(
    @Request() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<Booking[]> {
    return this.bookingService.findUpcoming(req.user.id, limit);
  }

  @Get('past')
  @FindPastBookingDocs()
  async findPast(
    @Request() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<Booking[]> {
    return this.bookingService.findPast(req.user.id, limit);
  }

  @Get(':id')
  @FindSingleBookingDocs()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Booking> {
    return this.bookingService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UpdateSingleBookingDocs()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req: any,
  ): Promise<Booking> {
    return this.bookingService.update(id, updateBookingDto, req.user.id);
  }

  @Patch(':id/status')
  @UpdateBookingStatusDocs()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateBookingStatusDto,
    @Request() req: any,
  ): Promise<Booking> {
    return this.bookingService.updateStatus(
      id,
      updateStatusDto.status,
      req.user.id,
    );
  }

  @Delete(':id')
  @DeleteSingleBookingDocs()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    return this.bookingService.remove(id, req.user.id);
  }
}
