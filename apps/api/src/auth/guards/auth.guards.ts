import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export const JWT_STRATEGY_NAME = 'jwt';
export const INTERNAL_API_KEY_STRATEGY_NAME = 'x-private-key';

/**
 * Authentication guard for public API usage requires a valid User JWT token
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {}

/**
 * Authentication guard for internal usage only between services
 */
@Injectable()
export class PrivateKeyAuthGuard extends AuthGuard(
  INTERNAL_API_KEY_STRATEGY_NAME,
) {}
