import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../users/entities/user.entity';

import { Repository } from 'typeorm';
import * as config from '@nestjs/config';
import jwtConfig from 'config/jwt.config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private jwtCongiguration: config.ConfigType<typeof jwtConfig>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtCongiguration.secret!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const { sub: userId } = payload;

    // Extract access token from request
    const accessToken = req.get('authorization')?.replace('Bearer ', '').trim();

    const user = await this.userRepository.findOne({
      where: { id: userId },
      withDeleted: true,
      relations: {
        auth: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Check if the access token is blacklisted
    if (user.auth?.blacklistedTokens && accessToken) {
      const isTokenBlacklisted =
        user.auth.blacklistedTokens.includes(accessToken);
      if (isTokenBlacklisted) {
        throw new UnauthorizedException();
      }
    }

    // check if password is null or empty
    if (
      user &&
      user.auth &&
      (!user.auth.hashedPassword || user.auth.hashedPassword === '')
    ) {
      throw new UnauthorizedException(
        'User is not registered with password authentication',
      );
    }

    return user;
  }
}
