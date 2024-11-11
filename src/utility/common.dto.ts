import { IsNotEmpty, IsUUID } from 'class-validator';

export class UuidDto {
  @IsNotEmpty()
  @IsUUID(4)
  uuid: string;
}
