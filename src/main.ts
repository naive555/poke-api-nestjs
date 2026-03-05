import compression from '@fastify/compress';
import cors from '@fastify/cors';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const logger = new Logger('NestApplication');

  const isCorsEnabled = configService.get<boolean>('common.cors');
  const name = configService.get<string>('common.name');
  const version = configService.get<string>('common.version');
  const environment = configService.get<string>('common.environment');
  const port = configService.get<number>('common.port') ?? 3001;

  if (isCorsEnabled) {
    await app.register(cors, {
      origin: configService.get<string | string[]>('common.corsDomains'),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });
  }

  await app.register(compression);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const config = new DocumentBuilder()
    .setTitle(name)
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`${name} - ${version}`);
  logger.log(`On ${environment} environment`);
  logger.log(`Enable CORS: ${isCorsEnabled}`);
  logger.log(`Started on port: ${port}`);
}

bootstrap();
