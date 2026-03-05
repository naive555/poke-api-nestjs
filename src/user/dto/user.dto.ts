import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'testuser' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'newusername' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'newpassword' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class UserQueryDto {
  @ApiPropertyOptional({ example: 'testuser' })
  @IsOptional()
  @IsString()
  username?: string;
}
