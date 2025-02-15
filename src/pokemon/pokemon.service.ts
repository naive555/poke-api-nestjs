import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

import {
  POKE_API_URL,
  POKEMON_CACHE_DURATION,
  POKEMON_KEY,
} from '../utility/common.constant';
import {
  IPokeApi,
  IPokeApiList,
  IPokeApiNameAndUrl,
  IPokemon,
  IPokemonAbility,
  IPokemonName,
} from './pokemon.interface';

@Injectable()
export class PokemonService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  async random(): Promise<IPokemonName> {
    this.logger.log({
      message: { function: this.random.name },
    });

    try {
      const pokemonsCache = await this.cacheManager.get<string[]>(POKEMON_KEY);
      if (pokemonsCache) {
        return {
          name: pokemonsCache[Math.floor(Math.random() * pokemonsCache.length)],
        };
      }

      const pokemons = await this.getPokemons();
      const pokemonNames = pokemons.map((pokemon) => pokemon.name);

      await this.cacheManager.set(
        POKEMON_KEY,
        pokemonNames,
        POKEMON_CACHE_DURATION,
      );

      return {
        name: pokemonNames[Math.floor(Math.random() * pokemonNames.length)],
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
      const pokemonCache = await this.cacheManager.get<IPokemon>(
        `${POKEMON_KEY}:${name}`,
      );
      if (pokemonCache) {
        return pokemonCache;
      }

      const pokemon = await this.getPokemon(name);
      await this.cacheManager.set(
        `${POKEMON_KEY}:${name}`,
        pokemon,
        POKEMON_CACHE_DURATION,
      );

      const abilities = { abilities: pokemon.abilities };
      await this.cacheManager.set(
        `${POKEMON_KEY}:${name}:abilities`,
        abilities,
        POKEMON_CACHE_DURATION,
      );

      return pokemon;
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
        data: { name },
      },
    });

    try {
      const abilitiesCache = await this.cacheManager.get<IPokemonAbility>(
        `${POKEMON_KEY}:${name}:abilities`,
      );
      if (abilitiesCache) {
        return abilitiesCache;
      }

      const pokemon = await this.getPokemon(name);
      const abilities = { abilities: pokemon.abilities };

      await this.cacheManager.set(
        `${POKEMON_KEY}:${name}:abilities`,
        abilities,
        POKEMON_CACHE_DURATION,
      );

      return abilities;
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

  private async getPokemons(): Promise<IPokeApiNameAndUrl[]> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<IPokeApiList>(`${POKE_API_URL}/pokemon?limit=100000&offset=0`)
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error({
              message: {
                function: this.getPokemons.name,
                error: error.response.data,
              },
            });
            throw new InternalServerErrorException(error.response.data);
          }),
        ),
    );

    return data.results;
  }

  private async getPokemon(name: string): Promise<IPokemon> {
    const { data } = await firstValueFrom(
      this.httpService.get<IPokeApi>(`${POKE_API_URL}/pokemon/${name}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error({
            message: {
              function: this.getPokemon.name,
              error: error.response.data,
            },
          });
          if (error.response.status === 404) {
            throw new NotFoundException('Pokemon not found');
          }
          throw new InternalServerErrorException(error.response.data);
        }),
      ),
    );

    return {
      name: data.name,
      types: data.types?.map((element) => element.type.name) || [],
      weight: data.weight,
      height: data.height,
      abilities: data.abilities?.map((element) => element.ability.name) || [],
      species: data.species.name,
      forms: data.forms?.map((element) => element.name) || [],
    };
  }
}
