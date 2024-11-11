import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app.config.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PokemonModule } from './pokemon/pokemon.module';

@Module({
  imports: [AppConfigModule, AuthModule, UserModule, PokemonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
