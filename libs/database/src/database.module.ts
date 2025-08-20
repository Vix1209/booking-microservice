import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

interface TypeormConfig {
  type: string;
  url: string;
  autoLoadEntities: boolean;
  synchronize: boolean;
  logging: boolean | string[];
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createTypeOrmConfig,
    }),
  ],
})
export class DatabaseModule {}

// Centralized configuration function
export function createTypeOrmConfig(configService: ConfigService): any {
  const dbUrl = configService.get('DATABASE_URL');
  const nodeEnv = configService.get('NODE_ENV');

  if (!dbUrl) {
    throw new Error('Database URL is not defined in environment variables');
  }

  const config: TypeormConfig = {
    type: 'postgres',
    url: dbUrl,
    autoLoadEntities: true,
    synchronize:
      configService.get('POSTGRES_SYNC') === 'true' ||
      nodeEnv === 'development',
    logging: nodeEnv === 'development' ? ['error', 'warn'] : false,
  };

  // Only add SSL configuration for production/cloud environments
  if (nodeEnv === 'production') {
    Logger.debug(
      `Connecting to database with SSL (Production)`,
      'DatabaseModule',
    );
    config.ssl = {
      rejectUnauthorized: false,
    };
  } else {
    Logger.debug(
      `Connecting to database without SSL (Development)`,
      'DatabaseModule',
    );
  }

  return config;
}
