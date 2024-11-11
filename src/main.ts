import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const logger = new Logger('NestApplication');
  const cors = configService.get('common.cors');
  const name = configService.get('common.name');
  const version = configService.get('common.version');
  const environment = configService.get('common.environment');
  const port = configService.get('common.port');

  if (cors) app.enableCors();

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(port, () => {
    logger.log(`${name} - ${version}`);
    logger.log(`On ${environment} environment`);
    logger.log(`Enable CORS ${cors}`);
    logger.log(`Started on port ${port}`);
  });
}
bootstrap();
