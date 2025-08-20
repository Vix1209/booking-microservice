import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-account.dto';
import { LoginDto } from './dto/login.dto';
import { GetUser } from 'decorators/getUser.decorator';
import { User } from '../users/entities/user.entity';
import { GetMeDocs, LogoutDocs, RefreshTokenDocs } from './docs/auth.docs';
import { RefreshJwtGuard } from './guard/refresh-jwt.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @LogoutDocs()
  logout(@Req() req: any) {
    const accessToken = req.get('authorization')?.replace('Bearer ', '').trim();
    return this.authService.logout(req.user, accessToken);
  }

  @Post('refresh-token')
  @UseGuards(RefreshJwtGuard)
  @ApiBearerAuth('REFRESH_JWT')
  @RefreshTokenDocs()
  refreshToken(@Req() req) {
    return this.authService.refreshToken(req.user);
  }

  @Get('me')
  @GetMeDocs()
  getMe(@GetUser() user: User) {
    return { user };
  }
}
