import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateUserDto } from '../user/dto/user.dto';
import { User } from '../user/user.entity';
import { GetAuthPayload } from './auth.decorator';
import { AuthDto } from './auth.dto';
import { IAuthPayload } from './auth.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthResponse } from './auth.response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: AuthDto })
  @ApiOkResponse({ type: AuthResponse, description: 'Return access token' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() { user }: { user: User }) {
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Register' })
  @ApiOkResponse({ type: AuthResponse, description: 'Return access token' })
  @ApiBadRequestResponse({ description: 'Username already exists' })
  @HttpCode(HttpStatus.OK)
  @Post('register')
  register(@Body() userDto: CreateUserDto) {
    return this.authService.register(userDto);
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Token cleared' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@GetAuthPayload() authPayload: IAuthPayload) {
    return this.authService.clearTokenCache(authPayload);
  }
}
