import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PokemonService } from './pokemon.service';
import { PokemonDto } from './dto/pokemon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get('random')
  findAll() {
    return this.pokemonService.random();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':name')
  findByName(@Param() pokemonDto: PokemonDto) {
    return this.pokemonService.findByName(pokemonDto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':name/ability')
  findAbilitiesByName(@Param() pokemonDto: PokemonDto) {
    return this.pokemonService.findAbilitiesByName(pokemonDto.name);
  }
}
