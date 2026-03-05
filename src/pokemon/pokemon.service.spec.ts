import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PokemonService } from './pokemon.service';
import { PokemonHelper } from './pokemon.helper';
import { IPokemon } from './pokemon.interface';

const mockPokemon: IPokemon = {
  name: 'bulbasaur',
  types: ['grass', 'poison'],
  weight: 69,
  height: 7,
  abilities: ['overgrow', 'chlorophyll'],
  species: 'seed',
  forms: ['bulbasaur'],
};

const mockPokemonHelper = {
  getPokemons: jest.fn(),
  getPokemon: jest.fn(),
};

describe('PokemonService', () => {
  let service: PokemonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonService,
        { provide: PokemonHelper, useValue: mockPokemonHelper },
      ],
    }).compile();

    service = module.get<PokemonService>(PokemonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------- //
  describe('random', () => {
    it('should return a random pokemon name', async () => {
      mockPokemonHelper.getPokemons.mockResolvedValue([
        'bulbasaur',
        'charmander',
        'squirtle',
      ]);

      const result = await service.random();

      expect(result).toHaveProperty('name');
      expect(['bulbasaur', 'charmander', 'squirtle']).toContain(result.name);
      expect(mockPokemonHelper.getPokemons).toHaveBeenCalledTimes(1);
    });

    it('should throw error when getPokemons fails', async () => {
      mockPokemonHelper.getPokemons.mockRejectedValue(
        new InternalServerErrorException('Failed to fetch'),
      );

      await expect(service.random()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByName', () => {
    it('should return pokemon by name', async () => {
      mockPokemonHelper.getPokemon.mockResolvedValue(mockPokemon);

      const result = await service.findByName('bulbasaur');

      expect(result).toEqual(mockPokemon);
      expect(mockPokemonHelper.getPokemon).toHaveBeenCalledWith('bulbasaur');
    });

    it('should throw NotFoundException when pokemon not found', async () => {
      mockPokemonHelper.getPokemon.mockRejectedValue(
        new NotFoundException('Pokemon not found'),
      );

      await expect(service.findByName('unknown')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPokemonHelper.getPokemon).toHaveBeenCalledWith('unknown');
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPokemonHelper.getPokemon.mockRejectedValue(
        new InternalServerErrorException('Unexpected error'),
      );

      await expect(service.findByName('bulbasaur')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAbilitiesByName', () => {
    it('should return abilities of a pokemon', async () => {
      mockPokemonHelper.getPokemon.mockResolvedValue(mockPokemon);

      const result = await service.findAbilitiesByName('bulbasaur');

      expect(result).toEqual({ abilities: ['overgrow', 'chlorophyll'] });
      expect(mockPokemonHelper.getPokemon).toHaveBeenCalledWith('bulbasaur');
    });

    it('should throw NotFoundException when pokemon not found', async () => {
      mockPokemonHelper.getPokemon.mockRejectedValue(
        new NotFoundException('Pokemon not found'),
      );

      await expect(service.findAbilitiesByName('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPokemonHelper.getPokemon.mockRejectedValue(
        new InternalServerErrorException('Unexpected error'),
      );

      await expect(service.findAbilitiesByName('bulbasaur')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
