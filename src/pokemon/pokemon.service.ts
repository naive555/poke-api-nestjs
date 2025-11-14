import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { IPokemon, IPokemonAbility, IPokemonName } from './pokemon.interface';
import { PokemonHelper } from './pokemon.helper';

@Injectable()
export class PokemonService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly pokemonHelper: PokemonHelper) {}

  async random(): Promise<IPokemonName> {
    this.logger.log({
      message: { function: this.random.name },
    });

    try {
      const pokemons = await this.pokemonHelper.getPokemons();
      return {
        name: pokemons[Math.floor(Math.random() * pokemons.length)],
      };
    } catch (error) {
      this.logger.error({
        message: {
          function: this.random.name,
          message: error.message,
        },
      });
      throw new InternalServerErrorException(error.message);
    }
  }

  async findByName(name: string): Promise<IPokemon> {
    this.logger.log({
      message: {
        function: this.findByName.name,
        data: { name },
      },
    });

    try {
      return this.pokemonHelper.getPokemon(name);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findByName.name,
          message: error.message,
          data: { name },
        },
      });
      if (error.status === 404) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAbilitiesByName(name: string): Promise<IPokemonAbility> {
    this.logger.log({
      message: {
        function: this.findAbilitiesByName.name,
        data: { pokemonName: name },
      },
    });

    try {
      const pokemon = await this.pokemonHelper.getPokemon(name);
      return { abilities: pokemon.abilities };
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findAbilitiesByName.name,
          message: error.message,
          data: { name },
        },
      });
      if (error.status === 404) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
