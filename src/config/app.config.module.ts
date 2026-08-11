import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { BullModule } from '@nestjs/bull';
import { LoggerModule } from 'nestjs-pino';

// config
import bcryptConfig from './bcrypt.config';
import commonConfig from './common.config';
import databaseConfig from './database.config';
import { validateEnv } from './env.validation';
import jwtConfig from './jwt.config';
import loggerConfig, { loggerModuleFactory } from './logger.config';
import redisConfig from './redis.config';
import { getEnvFilePath } from '../utility/common.function';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        bcryptConfig,
        commonConfig,
        databaseConfig,
        jwtConfig,
        loggerConfig,
        redisConfig,
      ],
      isGlobal: true,
      envFilePath: getEnvFilePath(process.env.NODE_ENV),
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      useFactory: loggerModuleFactory,
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
          },
          username: configService.get('redis.username'),
          password: configService.get('redis.password'),
          database: configService.get('redis.db'),
        }),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppConfigModule {}
