// REFRESH TOKEN FEATURE DISABLED - KEEPING IMPORT FOR FUTURE REFERENCE
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import refreshJwtConfig from 'config/refresh-jwt.config';
import { CreateUserDto } from './dto/create-account.dto';
import { emailRegex } from 'utils';
import { verify, hash } from 'argon2';
import { Auth } from './entities/auth.entity';
import * as config from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(refreshJwtConfig.KEY)
    private refreshTokenConfig: config.ConfigType<typeof refreshJwtConfig>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
    private jwtService: JwtService,
  ) {}

  // Create User
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Validate email
    if (!emailRegex().test(createUserDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email is already in use
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
      withDeleted: true,
      relations: { auth: true },
    });

    if (existingEmail) {
      if (
        existingEmail.auth?.deletedAt != null &&
        existingEmail.status === 'deleted'
      ) {
        throw new ConflictException(
          `Email ${createUserDto.email} belonged to a deleted account`,
        );
      } else {
        throw new ConflictException(
          `Email ${createUserDto.email} is already in use`,
        );
      }
    }

    if (!createUserDto.password) {
      throw new BadRequestException('Password is required');
    }

    const newUser = this.userRepository.create({
      email: createUserDto.email,
      role: createUserDto.role,
      auth: {
        hashedPassword: createUserDto.password,
      },
    });

    const savedUser = await this.userRepository.save(newUser);

    if (!savedUser) {
      throw new BadRequestException('Failed to create user');
    }

    return savedUser;
  }

  // Login User
  async login(
    dto: LoginDto,
  ): Promise<{ user: User; access_token: string; refresh_token: string }> {
    const account = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: true,
      relations: { auth: true },
    });

    if (!account) {
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }

    // Check if the user's account is active
    if (account.status == 'suspended') {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Check if the user's account is deleted
    if (account.status == 'deleted') {
      throw new UnauthorizedException('User account is deleted');
    }

    if (!account.auth) {
      throw new ConflictException(`Account auth data not found`);
    }

    // Validate the password
    const isPasswordValid = await verify(
      account.auth.hashedPassword,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const { access_token, refresh_token } =
      await this.generateJwtTokens(account);

    return { user: account, access_token, refresh_token };
  }

  // Logout User
  async logout(user: User, accessToken?: string) {
    const refresh_token = user.auth?.hashedRefreshToken;
    if (!refresh_token) {
      throw new BadRequestException('User refresh token does not exist');
    }

    if (!user?.auth) {
      throw new Error('User auth data not found');
    }

    // Prepare update data
    const updateData: any = { hashedRefreshToken: null };

    // If access token is provided, add it to blacklisted tokens
    if (accessToken) {
      const currentBlacklistedTokens = user.auth.blacklistedTokens || [];
      updateData.blacklistedTokens = [...currentBlacklistedTokens, accessToken];
    }

    await this.authRepository.update({ id: user.auth.id }, updateData);
  }

  // REFRESH TOKEN FEATURE DISABLED - KEEPING FOR FUTURE REFERENCE
  async validateRefreshToken(
    userId: string,
    refresh_token: string | undefined | null,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      withDeleted: true,
      relations: {
        auth: true,
      },
    });

    if (!user || !refresh_token || refresh_token === undefined) {
      throw new UnauthorizedException(
        'User is signed out or has an invalid refresh token',
      );
    }

    if (!user.auth || user.auth === undefined) {
      Logger.error('Auth table is not being passed across', 'AuthService');
      throw new Error('User auth data is missing');
    }

    // Check if refresh token has been revoked (set to null during logout)
    if (!user.auth.hashedRefreshToken) {
      throw new UnauthorizedException(
        'Refresh token has been revoked. Please log in again.',
      );
    }

    const refreshTokenMatches = await verify(
      user.auth.hashedRefreshToken,
      refresh_token,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }

  // Generate JWT Token - KEEPING ORIGINAL FOR FUTURE REFERENCE
  async generateJwtTokens(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.refreshTokenConfig),
    ]);

    // hash refresh token to be saved in database
    const hashedRefreshToken = await hash(refresh_token);

    if (!user?.auth) {
      throw new Error('User auth data not found');
    }

    await this.authRepository.update(
      { id: user.auth.id },
      { hashedRefreshToken },
    );

    return {
      access_token,
      refresh_token,
    };
  }

  // Generate tokens on refresh token call
  async refreshToken(user: User) {
    return await this.generateJwtTokens(user);
  }

  // Clean up expired blacklisted tokens
  async cleanupExpiredBlacklistedTokens(userId: string): Promise<number> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: { auth: true },
      });

      if (
        !user?.auth?.blacklistedTokens ||
        user.auth.blacklistedTokens.length === 0
      ) {
        return 0;
      }

      const initialCount = user.auth.blacklistedTokens.length;

      // Filter out expired tokens by attempting to verify them
      const validTokens: string[] = [];

      for (const token of user.auth.blacklistedTokens) {
        try {
          // If token is still valid (not expired), keep it in blacklist
          this.jwtService.verify(token);
          validTokens.push(token);
        } catch {
          // Token is expired or invalid, remove it from blacklist
          continue;
        }
      }

      // Update the blacklisted tokens array with only valid (non-expired) tokens
      if (validTokens.length !== user.auth.blacklistedTokens.length) {
        await this.authRepository.update(
          { id: user.auth.id },
          { blacklistedTokens: validTokens },
        );

        const cleanedCount = initialCount - validTokens.length;
        Logger.debug(
          `Cleaned ${cleanedCount} expired tokens for user with email ${user.email}`,
          'AuthService',
        );
        return cleanedCount;
      }

      return 0;
    } catch (error) {
      Logger.error(
        `Error cleaning tokens for user ${userId}: ${error.message}`,
        error.stack,
        'AuthService',
      );
      return 0;
    }
  }
}
