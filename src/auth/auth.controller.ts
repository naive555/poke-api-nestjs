import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { CreateUserDto } from '../user/dto/user.dto';
import { User } from '../user/user.entity';
import { GetAuthPayload } from './auth.decorator';
import { IAuthPayload } from './auth.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() { user }: { user: User }) {
    return this.authService.login(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('register')
  register(@Body() userDto: CreateUserDto) {
    return this.authService.register(userDto);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@GetAuthPayload() authPayload: IAuthPayload) {
    return this.authService.clearTokenCache(authPayload);
  }
}
