import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PokemonDto } from './dto/pokemon.dto';
import { PokemonService } from './pokemon.service';

@ApiTags('pokemon')
@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @ApiOperation({ summary: 'Get random pokemon name' })
  @ApiOkResponse({ schema: { example: { name: 'bulbasaur' } } })
  @Get('random')
  random() {
    return this.pokemonService.random();
  }

  @ApiOperation({ summary: 'Get pokemon by name' })
  @ApiOkResponse({
    schema: {
      example: {
        name: 'bulbasaur',
        types: ['grass', 'poison'],
        weight: 69,
        height: 7,
        abilities: ['overgrow'],
        species: 'seed',
        forms: ['bulbasaur'],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Pokemon not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':name')
  findByName(@Param() pokemonDto: PokemonDto) {
    return this.pokemonService.findByName(pokemonDto.name);
  }

  @ApiOperation({ summary: 'Get pokemon abilities by name' })
  @ApiOkResponse({
    schema: { example: { abilities: ['overgrow', 'chlorophyll'] } },
  })
  @ApiNotFoundResponse({ description: 'Pokemon not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':name/ability')
  findAbilitiesByName(@Param() pokemonDto: PokemonDto) {
    return this.pokemonService.findAbilitiesByName(pokemonDto.name);
  }
}
