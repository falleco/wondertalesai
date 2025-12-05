import { Injectable, Logger } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { Request } from 'express';

@Injectable()
export class PrincipalService {
  private readonly logger = new Logger(PrincipalService.name);

  constructor(private authService: BetterAuthService) {}

  async getPrincipal(req: Request) {
    const session = await this.authService.api.getSession({
      headers: fromNodeHeaders(req.headers),
      
    });

    this.logger.log('Connected accounts', session);

    return session?.user;
  }
}
