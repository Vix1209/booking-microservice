import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisConfig } from 'config/redis.config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const config = configService.get<RedisConfig>('redis');
        const redisUrl = config?.url;
        const defaultJobOptions = config?.default;

        if (!redisUrl) {
          throw new Error(
            'Redis URL not configured for Bull queue. Please set REDIS_URL environment variable.',
          );
        }

        return {
          redis: redisUrl,
          defaultJobOptions: defaultJobOptions,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService, ConfigService],
  exports: [RedisService, BullModule],
})
export class RedisModule {}
