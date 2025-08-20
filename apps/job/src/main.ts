import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

import { NestFactory } from '@nestjs/core';
import { JobModule } from './job.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(JobModule, {
    logger: ['error', 'warn', 'debug', 'log'],
    rawBody: true,
  });

  //Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Booking Microservice Job')
    .setDescription('Booking Microservice JOB Documentation')
    .addServer('/')
    .build();

  // Create Swagger document with custom options to prevent duplicate tags
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    ignoreGlobalPrefix: false,
  });

  try {
    SwaggerModule.setup('/job', app, document, {
      swaggerOptions: {
        useGlobalPrefix: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  } catch (error) {
    Logger.error(`Error setting up Swagger: ${error}`, 'Bootstrap');
  }

  await app.listen(process.env.JOB_PORT || 5001);
  const url = await app.getUrl();
  console.log(`Job Application is running on: ${url}`);
  console.log(`Job Application Docs is running on: ${url}/job`);
}
bootstrap();
