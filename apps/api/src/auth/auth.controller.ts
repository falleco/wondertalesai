import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequiresJwtAuth } from './decorators/auth.decorator';
import { AuthPrincipal, Principal } from './decorators/principal.decorator';

@ApiTags('Common')
@Controller('auth')
export class AuthController {
  @RequiresJwtAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Return the currently authenticated partner information',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the currently authenticated partner information',
    type: Principal,
  })
  async echo(@AuthPrincipal() principal: Principal) {
    return principal;
  }
}
