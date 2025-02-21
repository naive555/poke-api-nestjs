import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CreateUserDto } from '../user/dto/user.dto';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { USER_SESSION_KEY } from '../utility/common.constant';
import { Encrypt } from '../utility/encrypt';
import { IAuthPayload, IAuthResponse } from './auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(this.constructor.name);
  private readonly encrypt = new Encrypt(this.configService);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    this.logger.log({
      message: {
        function: this.validateUser.name,
        data: { username },
      },
    });

    if (!username || !password) {
      throw new BadRequestException('Username or password is invalid');
    }

    try {
      const user = await this.userService.getByUsername(username);
      if (!user) return null;

      const passwordValidated = await this.validatePassword(
        password,
        user.password,
      );
      if (!passwordValidated) return null;

      delete user.password;
      return user;
    } catch (error) {
      this.logger.error({
        message: {
          function: this.validateUser.name,
          message: error.message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async login(user: User): Promise<IAuthResponse> {
    this.logger.log({
      message: {
        function: this.login.name,
        data: { username: user.username },
      },
    });

    try {
      let accessToken = await this.getTokenCache(user.id);

      if (!accessToken) {
        const payload: IAuthPayload = {
          sub: user.id,
          username: user.username,
        };
        accessToken = this.jwtService.sign(
          payload,
          this.configService.get('jwt.signOptions'),
        );

        try {
          await this.setTokenCache(user.id, accessToken);
        } catch (error) {
          this.logger.error({
            message: {
              function: this.login.name,
              message: error.message,
              username: user.username,
            },
          });
        }
      }

      return { accessToken } as IAuthResponse;
    } catch (error) {
      this.logger.error({
        message: {
          function: this.login.name,
          message: error.message,
          username: user.username,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async register(userData: CreateUserDto): Promise<IAuthResponse> {
    this.logger.log({
      message: {
        function: this.register.name,
        data: { username: userData.username },
      },
    });

    try {
      const user = await this.userService.create(userData);

      return this.login(user);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.register.name,
          message: error.message,
          data: { username: userData.username },
        },
      });
      if (error.status === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException();
    }
  }

  async getTokenCache(userId: number): Promise<string> {
    try {
      this.logger.log({
        message: { function: this.getTokenCache.name, data: { userId } },
      });

      return this.cacheManager.get(`${USER_SESSION_KEY}:${userId}`);
    } catch (error) {
      this.logger.error({
        message: { function: this.getTokenCache.name, message: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async setTokenCache(userId: number, accessToken: string): Promise<void> {
    this.logger.log({
      message: {
        function: this.setTokenCache.name,
        data: { userId, accessToken },
      },
    });

    try {
      await this.cacheManager.set(
        `${USER_SESSION_KEY}:${userId}`,
        accessToken,
        +this.configService.get('jwt.signOptions.expiresIn') * 1000,
      );
    } catch (error) {
      this.logger.error({
        message: { function: this.setTokenCache.name, message: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async clearTokenCache(authPayload: IAuthPayload): Promise<void> {
    this.logger.log({
      message: {
        function: this.clearTokenCache.name,
        data: { userId: authPayload.sub },
      },
    });

    try {
      await this.cacheManager.del(`${USER_SESSION_KEY}:${authPayload.sub}`);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.clearTokenCache.name,
          message: error.message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async validatePassword(
    inputPassword: string,
    databasePassword: string,
  ): Promise<boolean> {
    return this.encrypt.verify(inputPassword, databasePassword);
  }
}
