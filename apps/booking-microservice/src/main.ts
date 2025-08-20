import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log'],
    rawBody: true,
  });

  //Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle(process.env.APP_NAME || 'API')
    .setDescription(
      process.env.APP_DESCRIPTION || 'Booking microservice API Documentation',
    )
    .setVersion(process.env.API_VERSION || '1.0')
    .addServer('/api/v1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'RefreshJWT' },
      'RefreshJWT',
    )
    .build();

  // Create Swagger document with custom options to prevent duplicate tags
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    ignoreGlobalPrefix: false,
  });

  try {
    SwaggerModule.setup('/api', app, document, {
      swaggerOptions: {
        useGlobalPrefix: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  } catch (error) {
    Logger.error(`Error setting up Swagger: ${error}`, 'Bootstrap');
  }

  // Set up versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Use ClassSerializerInterceptor globally
  // This will automatically serialize responses using class-transformer
  // and apply any decorators like @Exclude() or @Expose() in your entities
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Enable CORS with open configuration for testing
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('/api/');

  await app.listen(process.env.PORT || 5000);
  const url = await app.getUrl();
  console.log(`Application is running on: ${url}`);
}

bootstrap();
