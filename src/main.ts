import { randomUUID } from 'crypto';

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
import { Logger as PinoLoggerService } from 'nestjs-pino';

import { AppModule } from './app.module';
import { REQUEST_ID_HEADER } from './utility/common.constant';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // Every log line of a request is tagged with this id. Reusing an inbound
      // one keeps the trail intact when the call comes from another service.
      requestIdHeader: REQUEST_ID_HEADER,
      genReqId: () => randomUUID(),
    }),
    // Hold framework logs until pino takes over, so nothing is printed twice.
    { bufferLogs: true },
  );

  app.useLogger(app.get(PinoLoggerService));

  // Hand the id back so a caller can quote it when reporting a problem.
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, reply, done) => {
      reply.header(REQUEST_ID_HEADER, request.id);
      done();
    });

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

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.log(
    { version, environment, port, cors: isCorsEnabled },
    `${name} is listening on port ${port}`,
  );
}

void bootstrap();
