import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IAuthPayload } from '../auth.interface';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { USER_SESSION_KEY } from '../../utility/common.constant';

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
      const session = await this.cacheManager.get(
        `${USER_SESSION_KEY}:${authPayload.sub}`,
      );

      if (!session) {
        throw new UnauthorizedException();
      }

      return { ...authPayload };
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
