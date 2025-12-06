import { Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';

@Injectable()
export class PrincipalService {
  constructor(private authService: BetterAuthService) {}

  async getPrincipal(req: Request) {
    console.log('req.headers', req.headers.cookie);
    const session = await this.authService.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    return session?.user;
  }
}
