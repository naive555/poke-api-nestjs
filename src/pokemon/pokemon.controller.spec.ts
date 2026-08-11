import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PokemonDto } from './dto/pokemon.dto';
import { PokemonController } from './pokemon.controller';
import { PokemonService } from './pokemon.service';

const mockPokemonService = {
  random: jest.fn(),
  findByName: jest.fn(),
  findAbilitiesByName: jest.fn(),
};

describe('PokemonController', () => {
  let controller: PokemonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonController],
      providers: [{ provide: PokemonService, useValue: mockPokemonService }],
    }).compile();

    controller = module.get<PokemonController>(PokemonController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('random', () => {
    it('returns what the service returns', async () => {
      mockPokemonService.random.mockResolvedValue({ name: 'bulbasaur' });

      await expect(controller.random()).resolves.toEqual({
        name: 'bulbasaur',
      });
      expect(mockPokemonService.random).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByName', () => {
    it('unwraps the name from the param dto', async () => {
      const pokemon = { name: 'bulbasaur', types: ['grass'] };
      mockPokemonService.findByName.mockResolvedValue(pokemon);

      await expect(
        controller.findByName({ name: 'bulbasaur' } as PokemonDto),
      ).resolves.toEqual(pokemon);
      expect(mockPokemonService.findByName).toHaveBeenCalledWith('bulbasaur');
    });

    it('lets a service NotFoundException through untouched', async () => {
      mockPokemonService.findByName.mockRejectedValue(
        new NotFoundException('Pokemon not found'),
      );

      await expect(
        controller.findByName({ name: 'missingno' } as PokemonDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAbilitiesByName', () => {
    it('unwraps the name from the param dto', async () => {
      mockPokemonService.findAbilitiesByName.mockResolvedValue({
        abilities: ['overgrow'],
      });

      await expect(
        controller.findAbilitiesByName({ name: 'bulbasaur' } as PokemonDto),
      ).resolves.toEqual({ abilities: ['overgrow'] });
      expect(mockPokemonService.findAbilitiesByName).toHaveBeenCalledWith(
        'bulbasaur',
      );
    });
  });
});
