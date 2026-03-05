import { Injectable, Logger } from '@nestjs/common';

import { PokemonHelper } from './pokemon.helper';
import { IPokemon, IPokemonAbility, IPokemonName } from './pokemon.interface';

@Injectable()
export class PokemonService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly pokemonHelper: PokemonHelper) {}

  async random(): Promise<IPokemonName> {
    this.logger.log({ message: { function: this.random.name } });

    try {
      const pokemons = await this.pokemonHelper.getPokemons();
      return {
        name: pokemons[Math.floor(Math.random() * pokemons.length)],
      };
    } catch (error) {
      this.logger.error({
        message: { function: this.random.name, error: error.message },
      });
      throw error;
    }
  }

  async findByName(name: string): Promise<IPokemon> {
    this.logger.log({
      message: { function: this.findByName.name, data: { name } },
    });

    try {
      return await this.pokemonHelper.getPokemon(name);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findByName.name,
          error: error.message,
          data: { name },
        },
      });
      throw error;
    }
  }

  async findAbilitiesByName(name: string): Promise<IPokemonAbility> {
    this.logger.log({
      message: { function: this.findAbilitiesByName.name, data: { name } },
    });

    try {
      const pokemon = await this.pokemonHelper.getPokemon(name);
      return { abilities: pokemon.abilities };
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findAbilitiesByName.name,
          error: error.message,
          data: { name },
        },
      });
      throw error;
    }
  }
}
