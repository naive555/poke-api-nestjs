import { ApiProperty } from '@nestjs/swagger';

import { IAuthResponse } from './auth.interface';

export class AuthResponse implements IAuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9...' })
  accessToken: string;
}
