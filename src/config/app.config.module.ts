import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

// config
import bcrypt from './bcrypt';
import commonConfig from './common.config';
import databaseConfig from './database.config';
import jwt from './jwt';
import redisConfig from './redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [bcrypt, commonConfig, databaseConfig, jwt, redisConfig],
      isGlobal: true,
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
  ],
})
export class AppConfigModule {}
