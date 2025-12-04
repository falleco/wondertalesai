import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard, PrivateKeyAuthGuard } from '../guards/auth.guards';

/**
 * Syntatic Sugar for required API key authentication in a controller route
 *
 * @returns list of decorators to apply
 */
export function RequiresJwtAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiSecurity('jwt'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function RequiresInternalApiKeyAuth() {
  return applyDecorators(
    UseGuards(PrivateKeyAuthGuard),
    ApiSecurity('x-private-key'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
