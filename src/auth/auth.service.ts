import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { omit } from 'lodash';

import { CreateUserDto } from '../user/dto/user.dto';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { EncryptService } from '../encrypt/encrypt.service';
import { USER_SESSION_KEY } from '../utility/common.constant';
import { IAuthPayload, IAuthResponse } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly encrypt: EncryptService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    if (!username || !password) {
      throw new BadRequestException('Username or password is invalid');
    }

    try {
      const user = await this.userService.findByUsername(username);
      if (!user) return null;

      const isPasswordValid = await this.validatePassword(
        password,
        user.password,
      );
      if (!isPasswordValid) return null;

      return omit(user, ['password']) as User;
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async login(user: User): Promise<IAuthResponse> {
    try {
      let accessToken = await this.getTokenCache(user.id);
      if (!accessToken) {
        const payload: IAuthPayload = { sub: user.id, username: user.username };
        accessToken = this.jwtService.sign(
          payload,
          this.configService.get('jwt.signOptions'),
        );
        await this.setTokenCache(user.id, accessToken);
      }

      return { accessToken } as IAuthResponse;
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async register(userData: CreateUserDto): Promise<IAuthResponse> {
    const user = await this.userService.create(userData);
    return this.login(user);
  }

  async getTokenCache(userId: string): Promise<string> {
    try {
      return await this.cacheManager.get(`${USER_SESSION_KEY}:${userId}`);
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async setTokenCache(userId: string, accessToken: string): Promise<void> {
    try {
      await this.cacheManager.set(
        `${USER_SESSION_KEY}:${userId}`,
        accessToken,
        +this.configService.get('jwt.signOptions.expiresIn') * 1000,
      );
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async clearTokenCache(authPayload: IAuthPayload): Promise<void> {
    try {
      await this.cacheManager.del(`${USER_SESSION_KEY}:${authPayload.sub}`);
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async validatePassword(
    inputPassword: string,
    databasePassword: string,
  ): Promise<boolean> {
    return this.encrypt.verify(inputPassword, databasePassword);
  }
}
