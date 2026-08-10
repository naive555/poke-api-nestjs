import { Injectable } from '@nestjs/common';

import { PokemonHelper } from './pokemon.helper';
import { IPokemon, IPokemonAbility, IPokemonName } from './pokemon.interface';

@Injectable()
export class PokemonService {
  constructor(private readonly pokemonHelper: PokemonHelper) {}

  async random(): Promise<IPokemonName> {
    const pokemons = await this.pokemonHelper.getPokemons();
    return {
      name: pokemons[Math.floor(Math.random() * pokemons.length)],
    };
  }

  async findByName(name: string): Promise<IPokemon> {
    return this.pokemonHelper.getPokemon(name);
  }

  async findAbilitiesByName(name: string): Promise<IPokemonAbility> {
    const pokemon = await this.pokemonHelper.getPokemon(name);
    return { abilities: pokemon.abilities };
  }
}
