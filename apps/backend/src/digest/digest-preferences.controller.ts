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
import { DigestService } from './digest.service';

@Controller('api/preferences/digest')
export class DigestPreferencesController {
  constructor(
    private readonly digestService: DigestService,
    private readonly principalService: PrincipalService,
  ) {}

  @Get()
  async get(@Req() req: Request) {
    const userId = await this.getUserId(req);
    return this.digestService.getDigestPreferences(userId);
  }

  @Post()
  async update(
    @Req() req: Request,
    @Body()
    body: {
      dailyDigestEnabled?: boolean;
      dailyDigestTimeLocal?: string;
      weeklyDigestEnabled?: boolean;
      weeklyDigestDayOfWeek?: number;
      digestTimezone?: string;
      digestMaxItems?: number;
    },
  ) {
    const userId = await this.getUserId(req);
    const updated = await this.digestService.updateDigestPreferences(
      userId,
      body,
    );
    return {
      dailyDigestEnabled: updated.dailyDigestEnabled,
      dailyDigestTimeLocal: updated.dailyDigestTimeLocal,
      weeklyDigestEnabled: updated.weeklyDigestEnabled,
      weeklyDigestDayOfWeek: updated.weeklyDigestDayOfWeek,
      digestTimezone: updated.digestTimezone,
      digestMaxItems: updated.digestMaxItems,
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
