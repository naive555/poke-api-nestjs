import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PokemonDto {
  @ApiProperty({ example: 'bulbasaur' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
