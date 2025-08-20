import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  url?: string;
  default: {
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    connectTimeout: number;
    commandTimeout: number;
    removeOnComplete: boolean;
    removeOnFail: boolean;
  };
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    url: process.env.REDIS_URL,
    default: {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
      removeOnComplete: true,
      removeOnFail: true,
    },
  }),
);
