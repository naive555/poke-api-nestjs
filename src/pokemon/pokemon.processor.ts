import { Process, Processor } from '@nestjs/bull';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Job } from 'bull';

import {
  POKEMON_JOB_NAME,
  POKEMON_QUEUE_NAME,
} from '../utility/common.constant';
import { PokemonHelper } from './pokemon.helper';

@Processor(POKEMON_QUEUE_NAME)
export class PokemonProcessor {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly pokemonHelper: PokemonHelper) {}

  @Process(POKEMON_JOB_NAME)
  async getPokemonJob(job: Job<{ pokemonNames: string[] }>): Promise<void> {
    this.logger.log({
      message: { function: this.getPokemonJob.name, data: job.data },
    });

    try {
      const { pokemonNames } = job.data;
      for (const name of pokemonNames) {
        await this.pokemonHelper.getPokemon(name);
      }
    } catch (error) {
      this.logger.error({
        message: {
          function: this.getPokemonJob.name,
          error: error.message,
        },
      });
      throw new InternalServerErrorException(error.message);
    }
  }
}
