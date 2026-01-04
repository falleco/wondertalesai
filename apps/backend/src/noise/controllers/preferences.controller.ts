import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PrincipalService } from '@server/auth/principal.service';
import { Request } from 'express';
import { NoiseService } from '../services/noise.service';

@Controller('api/preferences')
export class PreferencesController {
  constructor(
    private readonly noiseService: NoiseService,
    private readonly principalService: PrincipalService,
  ) {}

  @Get()
  async getPreferences(@Req() req: Request) {
    const userId = await this.getUserId(req);
    return this.noiseService.getPreferences(userId);
  }

  @Post()
  async update(
    @Req() req: Request,
    @Body() body: { weeklyCleanupDigestEnabled?: boolean },
  ) {
    const userId = await this.getUserId(req);
    if (typeof body.weeklyCleanupDigestEnabled !== 'boolean') {
      return { updated: false };
    }
    const prefs = await this.noiseService.updatePreferences(userId, {
      weeklyCleanupDigestEnabled: body.weeklyCleanupDigestEnabled,
    });
    return {
      updated: true,
      weeklyCleanupDigestEnabled: prefs.weeklyCleanupDigestEnabled,
    };
  }

  private async getUserId(req: Request) {
    const principal = await this.principalService.getPrincipal(req);
    if (!principal) {
      throw new UnauthorizedException();
    }
    return principal.id;
  }
}
