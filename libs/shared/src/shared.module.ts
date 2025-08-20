import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [ConfigModule, RedisModule, WebSocketModule],
  exports: [RedisModule, WebSocketModule],
})
export class SharedModule {}
