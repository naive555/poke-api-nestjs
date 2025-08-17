import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { PokemonController } from './pokemon.controller';
import { PokemonService } from './pokemon.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pokemon } from './pokemon.entity';
import { PokemonHelper } from './pokemon.helper';
import { PokemonProcessor } from './pokemon.processor';
import { POKEMON_QUEUE_NAME } from '../utility/common.constant';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Pokemon]),
    BullModule.registerQueue({
      name: POKEMON_QUEUE_NAME,
    }),
  ],
  controllers: [PokemonController],
  providers: [PokemonService, PokemonHelper, PokemonProcessor],
})
export class PokemonModule {}
