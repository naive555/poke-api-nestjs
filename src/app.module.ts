import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app.config.module';
import { LoggingInterceptor } from './middleware/loggin.interceptor';
import { PokemonModule } from './pokemon/pokemon.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [AppConfigModule, AuthModule, UserModule, PokemonModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
