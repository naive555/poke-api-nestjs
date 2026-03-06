export interface IPokemonName {
  name: string;
}

export interface IPokemonAbility {
  abilities: string[];
}

export interface IPokeApiNameAndUrl {
  name: string;
  url: string;
}

export interface IPokeApiList {
  count: number;
  next: string | null;
  previous: string | null;
  results: IPokeApiNameAndUrl[];
}

export interface IPokeApiAbility {
  ability: IPokeApiNameAndUrl;
  is_hidden: boolean;
  slot: number;
}

export interface IPokeApiType {
  slot: number;
  type: IPokeApiNameAndUrl;
}

export interface IPokeApi {
  abilities: IPokeApiAbility[] | null;
  forms?: IPokeApiNameAndUrl[] | null;
  height: number;
  name: string;
  species: IPokeApiNameAndUrl;
  types?: IPokeApiType[] | null;
  weight: number;
}

export interface IPokemon {
  name: string;
  types: string[];
  weight: number;
  height: number;
  abilities: string[];
  species: string;
  forms: string[];
}
