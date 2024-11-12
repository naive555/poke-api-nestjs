export interface IPokemonName {
  name: string;
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

export interface IPokeAbility {
  ability: IPokeApiNameAndUrl;
  is_hidden: boolean;
  slot: number;
}

export interface IPokeTypes {
  slot: number;
  type: IPokeApiNameAndUrl;
}

export interface IPokeApi {
  abilities: IPokeAbility[] | null;
  forms?: IPokeApiNameAndUrl[] | null;
  height: number;
  name: string;
  species: IPokeApiNameAndUrl;
  types?: IPokeTypes[] | null;
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
