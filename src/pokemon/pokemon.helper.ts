import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { Queue } from 'bull';
import { chunk } from 'lodash';
import { catchError, firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import {
  POKE_API_URL,
  POKEMON_CACHE_DURATION,
  POKEMON_JOB_NAME,
  POKEMON_KEY,
  POKEMON_QUEUE_NAME,
} from '../utility/common.constant';
import { EStatus } from '../utility/common.enum';
import { Pokemon } from './pokemon.entity';
import { IPokeApi, IPokeApiList, IPokemon } from './pokemon.interface';

@Injectable()
export class PokemonHelper implements OnModuleInit {
  private readonly logger = new Logger(this.constructor.name);

  async onModuleInit() {
    await this.getPokemons();
  }

  constructor(
    private readonly httpService: HttpService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectRepository(Pokemon)
    private readonly pokemonRepository: Repository<Pokemon>,
    @InjectQueue(POKEMON_QUEUE_NAME)
    private readonly pokemonQueue: Queue,
  ) {}

  async getPokemons(): Promise<string[]> {
    const pokemonsCache = await this.cacheManager.get<string[]>(POKEMON_KEY);
    if (pokemonsCache) return pokemonsCache;

    const pokemonsDb = await this.pokemonRepository.find({
      where: { status: EStatus.ENABLED },
      select: { name: true },
    });
    if (pokemonsDb.length) {
      const names = pokemonsDb.map((p) => p.name);
      await this.cacheManager.set(POKEMON_KEY, names, POKEMON_CACHE_DURATION);
      return names;
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

    const pokemonNames = data.results.map((p) => p.name);
    await this.cacheManager.set(
      POKEMON_KEY,
      pokemonNames,
      POKEMON_CACHE_DURATION,
    );

    const CHUNK_SIZE = 100;
    const chunks = chunk(pokemonNames, CHUNK_SIZE);
    await Promise.all(
      chunks.map((names) => this.pokemonQueue.add(POKEMON_JOB_NAME, { names })),
    );

    return pokemonNames;
  }

  async getPokemon(name: string): Promise<IPokemon> {
    const pokemonCache = await this.cacheManager.get<IPokemon>(
      `${POKEMON_KEY}:${name}`,
    );
    if (pokemonCache) return pokemonCache;

    const pokemonDb = await this.pokemonRepository.findOneBy({
      name,
      status: EStatus.ENABLED,
    });
    if (pokemonDb) {
      const pokemonData: IPokemon = {
        name: pokemonDb.name,
        types: pokemonDb.types,
        weight: pokemonDb.weight,
        height: pokemonDb.height,
        abilities: pokemonDb.abilities,
        species: pokemonDb.species,
        forms: pokemonDb.forms,
      };
      await this.cacheManager.set(
        `${POKEMON_KEY}:${name}`,
        pokemonData,
        POKEMON_CACHE_DURATION,
      );
      return pokemonData;
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
          if (error.response.status === 404)
            throw new NotFoundException('Pokemon not found');
          throw new InternalServerErrorException(error.response.data);
        }),
      ),
    );

    const newPokemon: IPokemon = {
      name: data.name,
      types: data.types?.map((e) => e.type.name) || [],
      weight: data.weight,
      height: data.height,
      abilities: data.abilities?.map((e) => e.ability.name) || [],
      species: data.species.name,
      forms: data.forms?.map((e) => e.name) || [],
    };

    await Promise.all([
      this.pokemonRepository.upsert(
        { ...newPokemon },
        { conflictPaths: ['name'] },
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
