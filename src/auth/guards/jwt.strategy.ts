import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { decode } from 'jsonwebtoken';

import { USER_SESSION_KEY } from '../../utility/common.constant';
import { IAuthPayload } from '../auth.interface';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    authPayload: IAuthPayload,
  ): Promise<IAuthPayload> {
    try {
      const accessToken = await this.cacheManager.get<string>(
        `${USER_SESSION_KEY}:${authPayload.sub}`,
      );
      if (accessToken) {
        return authPayload;
      }

      const user = await this.userService.findById(authPayload.sub);
      if (user) {
        const accessToken = this.extractTokenFromHeader(request);
        const jwtPayload = decode(accessToken, { json: true });
        await this.cacheManager.set(
          `${USER_SESSION_KEY}:${authPayload.sub}`,
          accessToken,
          new Date().getTime() - jwtPayload.exp * 1000,
        );

        return authPayload;
      }

      throw new UnauthorizedException();
    } catch {
      throw new UnauthorizedException();
    }
  }

  extractTokenFromHeader(request: Request) {
    const extractToken = ExtractJwt.fromAuthHeaderAsBearerToken();
    return extractToken(request);
  }
}
