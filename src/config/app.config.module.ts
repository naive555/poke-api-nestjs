import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

// config
import bcryptConfig from './bcrypt.config';
import commonConfig from './common.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';
import { envPath } from '../utility/common.function';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        bcryptConfig,
        commonConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
      ],
      isGlobal: true,
      envFilePath: envPath(process.env.NODE_ENV),
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
