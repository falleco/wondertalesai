import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AppConfigurationType } from '@server/config/configuration';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { DatasourcesService } from './datasources.service';

@Controller('integrations/gmail')
export class DatasourcesController {
  constructor(
    private readonly datasourcesService: DatasourcesService,
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {}

  @AllowAnonymous()
  @Get('callback')
  async gmailCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.status(400).send('Missing OAuth parameters');
    }

    const result = await this.datasourcesService.handleGmailCallback(
      code,
      state,
    );

    const redirectTo = result.redirectTo ?? this.getDefaultRedirectUrl();
    let url: URL;
    try {
      url = new URL(redirectTo);
    } catch {
      url = new URL(this.getDefaultRedirectUrl());
    }
    url.searchParams.set('integration', 'gmail');
    url.searchParams.set('status', 'connected');

    return res.redirect(url.toString());
  }

  @AllowAnonymous()
  @Post('push')
  async handlePush(@Body() body: { message?: { data?: string } }) {
    return this.datasourcesService.handleGmailPushNotification(body);
  }

  private getDefaultRedirectUrl() {
    const corsValue =
      this.configService.get<AppConfigurationType['cors']>('cors') ?? '';
    const base = corsValue.split(',').map((entry: string) => entry.trim())[0];
    if (base?.startsWith('http')) {
      return `${base.replace(/\/$/, '')}/integrations`;
    }
    return 'http://localhost:3000/integrations';
  }
}
