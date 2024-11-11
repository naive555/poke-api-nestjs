import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

import { AuthDto } from './auth.dto';
import { IAuthPayload, IAuthResponse } from './auth.interface';
import { UserService } from '../user/user.service';
import { Encrypt } from '../utility/encrypt';
import { JwtService } from '@nestjs/jwt';
import { USER_SESSION_KEY } from '../utility/common.constant';

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

  async login(loginBody: AuthDto): Promise<IAuthResponse> {
    this.logger.log({
      message: {
        function: this.login.name,
        data: { username: loginBody.username },
      },
    });

    try {
      const user = await this.userService.getUserByUsername(loginBody.username);
      if (!user) {
        this.logger.error({
          message: {
            function: this.login.name,
            message: 'User not found',
            data: { username: loginBody.username },
          },
        });
        throw new UnauthorizedException('Username is incorrect');
      }

      const passwordValidated = await this.validatePassword(
        loginBody.password,
        user.password,
      );
      if (!passwordValidated) {
        this.logger.warn({
          message: {
            function: this.login.name,
            message: 'Password mismatch',
            data: { username: loginBody.username },
          },
        });
        throw new UnauthorizedException('Password is incorrect');
      }

      let accessToken = await this.getTokenCache(user.id);

      if (!accessToken) {
        const payload: IAuthPayload = {
          sub: user.id,
          username: user.username,
        };
        accessToken = this.jwtService.sign(payload);

        try {
          await this.setTokenCache(user.id, accessToken);
        } catch (error) {
          this.logger.error({
            message: {
              function: this.login.name,
              message: error.message,
              userId: loginBody.username,
            },
          });
        }
      }

      return { accessToken } as IAuthResponse;
    } catch (error) {
      throw new UnauthorizedException('Username or password is incorrect');
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
    return inputPassword === databasePassword;
    return this.encrypt.verify(inputPassword, databasePassword);
  }
}
