import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { USER_SESSION_KEY } from '../../utility/common.constant';
import { IAuthPayload } from '../auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(_: Request, authPayload: IAuthPayload): Promise<IAuthPayload> {
    try {
      const accessToken = await this.cacheManager.get<string>(
        `${USER_SESSION_KEY}:${authPayload.sub}`,
      );
      if (!accessToken) {
        throw new UnauthorizedException();
      }

      return authPayload;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
