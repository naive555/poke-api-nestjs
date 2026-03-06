import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { decode } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserService } from '../../user/user.service';
import { USER_SESSION_KEY } from '../../utility/common.constant';
import { IAuthPayload } from '../auth.interface';

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
      const cachedToken = await this.cacheManager.get<string>(
        `${USER_SESSION_KEY}:${authPayload.sub}`,
      );
      if (cachedToken) return authPayload;

      const user = await this.userService.findById(authPayload.sub);
      if (!user) throw new UnauthorizedException();

      const accessToken = this.extractTokenFromHeader(request);
      if (!accessToken) throw new UnauthorizedException();

      const jwtPayload = decode(accessToken, { json: true });
      if (!jwtPayload?.exp) throw new UnauthorizedException();

      const ttl = jwtPayload.exp * 1000 - new Date().getTime();
      if (ttl <= 0) throw new UnauthorizedException();

      await this.cacheManager.set(
        `${USER_SESSION_KEY}:${authPayload.sub}`,
        accessToken,
        ttl,
      );

      return authPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const [type, token] =
      (request.headers as any).authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
