import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../guard/jwt.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RefreshJwtGuard } from '../guard/refresh-jwt.guard';

export function LogoutDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Logout User' }),
    ApiBearerAuth('JWT'),
    UseGuards(JwtGuard),
  );
}

export function GetMeDocs() {
  return applyDecorators(
    UseGuards(JwtGuard),
    ApiBearerAuth('JWT'),
    ApiOperation({ summary: 'Get Currently logged in User' }),
  );
}

export function RefreshTokenDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Refresh Token' }),
    ApiBearerAuth('REFRESH_JWT'),
    UseGuards(RefreshJwtGuard),
  );
}
