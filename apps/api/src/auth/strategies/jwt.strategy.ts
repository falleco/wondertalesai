import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import * as jwksRsa from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigurationType } from 'src/config/configuration';
import { JWT_STRATEGY_NAME } from '../guards/auth.guards';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(readonly configService: ConfigService) {
    const config = configService.getOrThrow<AppConfigurationType['jwt']>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: config.issuer,
      algorithms: ['RS256'],
      ignoreExpiration: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        jwksUri: config.jwksUri,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }),
    });
  }

  validate(payload: unknown) {
    if (!payload) throw new Error('Invalid JWT payload');
    return {};
  }
}
