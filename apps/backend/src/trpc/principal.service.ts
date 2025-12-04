import { Injectable, Logger } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { auth } from '../auth';
import { Request } from 'express';

@Injectable()
export class PrincipalService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private authService: AuthService<typeof auth>) {}

  async getAccounts(req: Request) {
    const accounts = await this.authService.api.listUserAccounts({
      headers: fromNodeHeaders(req.headers),
    });

    this.logger.log('Connected accounts', accounts);

    return { accounts };
  }
}
