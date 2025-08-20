import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Booking } from '../entities/booking.entity';

export function CreateBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new booking' }),
    ApiResponse({
      status: 201,
      description: 'Booking created successfully',
      type: Booking,
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}

export function FindBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all bookings for the authenticated user' }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page',
    }),
    ApiResponse({
      status: 200,
      description: 'Bookings retrieved successfully',
    }),
  );
}

export function FindUpcomingBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get upcoming bookings' }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of bookings to return',
    }),
    ApiResponse({
      status: 200,
      description: 'Upcoming bookings retrieved successfully',
      type: [Booking],
    }),
  );
}

export function FindPastBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get past bookings' }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of bookings to return',
    }),
    ApiResponse({
      status: 200,
      description: 'Past bookings retrieved successfully',
      type: [Booking],
    }),
  );
}

export function FindSingleBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a specific booking by ID' }),
    ApiResponse({
      status: 200,
      description: 'Booking retrieved successfully',
      type: Booking,
    }),
    ApiResponse({ status: 404, description: 'Booking not found' }),
  );
}

export function UpdateSingleBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a specific booking by ID' }),
    ApiResponse({
      status: 200,
      description: 'Booking updated successfully',
      type: Booking,
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 404, description: 'Booking not found' }),
  );
}

export function UpdateBookingStatusDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update booking status' }),
    ApiResponse({
      status: 200,
      description: 'Booking status updated successfully',
      type: Booking,
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 404, description: 'Booking not found' }),
  );
}

export function DeleteSingleBookingDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a booking' }),
    ApiResponse({ status: 200, description: 'Booking deleted successfully' }),
    ApiResponse({ status: 404, description: 'Booking not found' }),
  );
}
