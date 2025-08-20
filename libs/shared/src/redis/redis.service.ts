import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConfig } from 'config/redis.config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    const config = this.configService.get<RedisConfig>('redis');

    try {
      // Main client for general operations
      const redisUrl = config?.url;

      if (!redisUrl) {
        throw new Error(
          'Redis URL not configured. Please set REDIS_URL environment variable.',
        );
      }

      // Create Redis client with URL string
      this.client = new Redis(redisUrl, {
        ...config.default,
        lazyConnect: true,
      });

      this.setupEventHandlers();

      // Explicitly connect
      await this.client.connect();

      this.logger.log('Redis connections established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  private async disconnect() {
    try {
      await Promise.all([this.client?.quit()]);
      this.logger.log('Redis connections closed successfully');
    } catch (error) {
      this.logger.error('Error closing Redis connections', error);
    }
  }

  private setupEventHandlers() {
    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting...');
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async publish(channel: string, data: any): Promise<number> {
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      const result = await this.client.publish(channel, payload);
      this.logger.log(`Published to channel ${channel}: ${payload}`);
      return result;
    } catch (error) {
      this.logger.error(`Error publishing to channel ${channel}:`, error);
      throw error;
    }
  }

  async publishBookingEvent(event: string, data: any): Promise<void> {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    await this.publish('booking_event', payload);
  }

  async setJson(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      return await this.set(key, jsonValue, ttlSeconds);
    } catch (error) {
      this.logger.error(`Error setting JSON key ${key}:`, error);
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting JSON key ${key}:`, error);
      return null;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      return false;
    }
  }
}
