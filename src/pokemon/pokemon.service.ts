import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import * as pLimit from 'p-limit';
import { catchError, firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import {
  CONCURRENT,
  POKE_API_URL,
  POKEMON_CACHE_DURATION,
  POKEMON_KEY,
} from '../utility/common.constant';
import { EStatus } from '../utility/common.enum';
import { Pokemon } from './pokemon.entity';
import {
  IPokeApi,
  IPokeApiList,
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
    @InjectRepository(Pokemon)
    private readonly pokemonRepository: Repository<Pokemon>,

    private readonly httpService: HttpService,
  ) {}

  async random(): Promise<IPokemonName> {
    this.logger.log({
      message: { function: this.random.name },
    });

    try {
      const pokemons = await this.getPokemons();
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
      return this.getPokemon(name);
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
      const pokemon = await this.getPokemon(name);
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

  private async getPokemons(): Promise<string[]> {
    const pokemonsCache = await this.cacheManager.get<string[]>(POKEMON_KEY);
    if (pokemonsCache) {
      return pokemonsCache;
    }

    const pokemonsDb = await this.pokemonRepository.find({
      where: {
        status: EStatus.ENABLED,
      },
      select: { name: true },
    });
    if (pokemonsDb.length) {
      return this.cacheManager.set(
        POKEMON_KEY,
        pokemonsDb.map((pokemon) => pokemon.name),
        POKEMON_CACHE_DURATION,
      );
    }

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

    const pokemonNames = await this.cacheManager.set(
      POKEMON_KEY,
      data.results.map((pokemon) => pokemon.name),
      POKEMON_CACHE_DURATION,
    );

    const limit = pLimit(CONCURRENT);
    const tasks = [];
    for (const name of pokemonNames) {
      tasks.push(limit(() => this.getPokemon(name)));
    }

    await Promise.all(tasks);

    return pokemonNames;
  }

  private async getPokemon(name: string): Promise<IPokemon> {
    this.logger.log(`getPokemon: ${name}`);
    const pokemonCache = await this.cacheManager.get<IPokemon>(
      `${POKEMON_KEY}:${name}`,
    );
    if (pokemonCache) {
      return pokemonCache;
    }

    const pokemonDb = await this.pokemonRepository.findOneBy({
      name,
      status: EStatus.ENABLED,
    });
    if (pokemonDb) {
      return this.cacheManager.set(
        `${POKEMON_KEY}:${name}`,
        {
          name: pokemonDb.name,
          types: JSON.parse(pokemonDb.types),
          weight: pokemonDb.weight,
          height: pokemonDb.height,
          abilities: JSON.parse(pokemonDb.abilities),
          species: pokemonDb.species,
          forms: JSON.parse(pokemonDb.forms),
        },
        POKEMON_CACHE_DURATION,
      );
    }

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

    const newPokemon: IPokemon = {
      name: data.name,
      types: data.types?.map((element) => element.type.name) || [],
      weight: data.weight,
      height: data.height,
      abilities: data.abilities?.map((element) => element.ability.name) || [],
      species: data.species.name,
      forms: data.forms?.map((element) => element.name) || [],
    };
    await Promise.all([
      this.pokemonRepository.upsert(
        {
          name: newPokemon.name,
          types: JSON.stringify(newPokemon.types),
          weight: newPokemon.weight,
          height: newPokemon.height,
          abilities: JSON.stringify(newPokemon.abilities),
          species: newPokemon.species,
          forms: JSON.stringify(newPokemon.forms),
        },
        {
          conflictPaths: ['name'],
          upsertType: 'on-duplicate-key-update',
        },
      ),
      this.cacheManager.set(
        `${POKEMON_KEY}:${name}`,
        newPokemon,
        POKEMON_CACHE_DURATION,
      ),
    ]);

    return newPokemon;
  }
}
