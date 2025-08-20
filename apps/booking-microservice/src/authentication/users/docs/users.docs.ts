import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { JwtGuard } from '../../auth/guard/jwt.guard';

export function GetProfileDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get user profile' }),
    ApiResponse({
      status: 200,
      description: 'User profile retrieved successfully',
      type: User,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiBearerAuth('JWT'),
    UseGuards(JwtGuard),
  );
}

export function UpdateProfileDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update user profile' }),
    ApiResponse({
      status: 200,
      description: 'User profile updated successfully',
      type: User,
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiResponse({ status: 409, description: 'Email already in use' }),
    ApiBearerAuth('JWT'),
    UseGuards(JwtGuard),
  );
}

export function UpdatePasswordDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update user password' }),
    ApiResponse({
      status: 200,
      description: 'Password updated successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Password updated successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiBearerAuth('JWT'),
    UseGuards(JwtGuard),
  );
}

export function DeleteAccountDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete user account' }),
    ApiResponse({
      status: 200,
      description: 'Account deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Account deleted successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized or incorrect password',
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiBearerAuth('JWT'),
    UseGuards(JwtGuard),
  );
}
