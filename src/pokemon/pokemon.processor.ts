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
    const { names } = job.data;

    try {
      for (const name of names) {
        await this.pokemonHelper.getPokemon(name);
      }

      this.logger.debug(
        { jobId: job.id, count: names.length },
        'Job completed',
      );
    } catch (error) {
      // Queue jobs run outside any request, so failures have to be reported here.
      this.logger.error({ err: error, jobId: job.id }, 'Job failed');
      throw error;
    }
  }
}
