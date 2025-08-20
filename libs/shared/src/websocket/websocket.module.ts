import { Module, Global } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [WebSocketGateway, WebSocketService, ConfigService],
  exports: [WebSocketGateway, WebSocketService],
})
export class WebSocketModule {}
