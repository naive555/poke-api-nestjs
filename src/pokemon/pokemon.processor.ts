import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import {
  POKEMON_JOB_NAME,
  POKEMON_QUEUE_NAME,
} from '../utility/common.constant';
import { PokemonHelper } from './pokemon.helper';

type PokemonJobData = {
  names: string[];
};

@Processor(POKEMON_QUEUE_NAME)
export class PokemonProcessor {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly pokemonHelper: PokemonHelper) {}

  @Process(POKEMON_JOB_NAME)
  async getPokemonJob(job: Job<PokemonJobData>): Promise<void> {
    this.logger.log({
      message: { function: this.getPokemonJob.name, data: job.data },
    });

    try {
      const { names } = job.data;
      for (const name of names) {
        await this.pokemonHelper.getPokemon(name);
      }
    } catch (error) {
      this.logger.error({
        message: {
          function: this.getPokemonJob.name,
          error: error.message,
        },
      });
      throw error;
    }
  }
}
