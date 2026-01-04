import { Controller, Get, Session } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSession } from '@thallesp/nestjs-better-auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @ApiOperation({
    summary: 'Get the current user',
    description: 'Get the current user',
  })
  @Get('me')
  async me(@Session() session: UserSession) {
    return session;
  }
}
