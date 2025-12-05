import { Controller, Get, Session } from '@nestjs/common';
import { UserSession } from '@thallesp/nestjs-better-auth';

@Controller('auth')
export class AuthController {
  @Get('me')
  async me(@Session() session: UserSession) {
    return session;
  }
}
