import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthDto {
  @ApiProperty({ example: 'testuser' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
