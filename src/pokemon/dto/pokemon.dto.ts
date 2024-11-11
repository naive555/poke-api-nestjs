import { IsNotEmpty, IsString } from 'class-validator';

export class PokemonDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
