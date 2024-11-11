import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import {
  IPokeApiResponseList,
  IPokeApiResponse,
  IPokemonResponse,
  IPokeAbility,
} from './pokemon.interface';
import { POKEMON_CACHE_TIMEOUT, POKEMON_KEY } from '../utility/common.constant';

@Injectable()
export class PokemonService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  async random(): Promise<IPokemonResponse> {
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

      const { data } = await firstValueFrom(
        this.httpService
          .get<IPokeApiResponseList>(
            'https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0',
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error({
                message: {
                  function: this.random.name,
                  error: error.response.data,
                },
              });
              throw new InternalServerErrorException();
            }),
          ),
      );

      const pokemonNames = data.results.map((pokemon) => pokemon.name);

      await this.cacheManager.set(
        POKEMON_KEY,
        pokemonNames,
        POKEMON_CACHE_TIMEOUT,
      );

      return {
        name: pokemonNames[Math.floor(Math.random() * data.results.length)],
      };
    } catch (error) {
      this.logger.error({
        message: {
          function: this.random.name,
          error: error.message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async findByName(name: string) {
    this.logger.log({
      message: {
        function: this.findByName.name,
        data: { name },
      },
    });

    try {
      const pokemonCache = await this.cacheManager.get<IPokeApiResponse>(
        `${POKEMON_KEY}:${name}`,
      );
      if (pokemonCache) {
        return pokemonCache;
      }

      const { data } = await firstValueFrom(
        this.httpService
          .get<IPokeApiResponse>(`https://pokeapi.co/api/v2/pokemon/${name}`)
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error({
                message: {
                  function: this.findByName.name,
                  error: error.response.data,
                },
              });
              throw new InternalServerErrorException();
            }),
          ),
      );

      await this.cacheManager.set(
        `${POKEMON_KEY}:${name}`,
        data,
        POKEMON_CACHE_TIMEOUT,
      );

      return data;
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findByName.name,
          message: error.message,
          data: { name },
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async findAbilitiesByName(name: string) {
    this.logger.log({
      message: {
        function: this.findAbilitiesByName.name,
        data: { name },
      },
    });

    try {
      const abilitiesCache = await this.cacheManager.get<IPokeAbility[]>(
        `${POKEMON_KEY}:${name}:abilities`,
      );
      if (abilitiesCache) {
        return abilitiesCache;
      }

      const { data } = await firstValueFrom(
        this.httpService
          .get<IPokeApiResponse>(`https://pokeapi.co/api/v2/pokemon/${name}`)
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error({
                message: {
                  function: this.findAbilitiesByName.name,
                  error: error.response.data,
                },
              });
              throw new InternalServerErrorException();
            }),
          ),
      );

      await this.cacheManager.set(
        `${POKEMON_KEY}:${name}:abilities`,
        data.abilities,
        POKEMON_CACHE_TIMEOUT,
      );

      return data.abilities;
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findAbilitiesByName.name,
          message: error.message,
          data: { name },
        },
      });
      throw new InternalServerErrorException();
    }
  }
}
