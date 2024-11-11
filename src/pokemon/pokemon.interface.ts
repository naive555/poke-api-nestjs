export interface IPokemonResponse {
  name: string;
}

export interface IPokeApiName {
  name: string;
  url: string;
}

export interface IPokeApiResponseList {
  count: number;
  next: string | null;
  previous: string | null;
  results: IPokeApiName[];
}

export interface IPokeApiResponse {
  abilities: IPokeAbility[];
  is_hidden: boolean;
  slot: number;
}

export interface IPokeAbility {
  ability: IPokeApiName;
}
