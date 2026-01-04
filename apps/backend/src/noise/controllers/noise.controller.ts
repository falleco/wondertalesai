import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PrincipalService } from '@server/auth/principal.service';
import { Request } from 'express';
import {
  type BlockRuleAction,
  type BlockRuleMatchType,
} from '../entities/block-rule.entity';
import { NoiseService } from '../services/noise.service';
import { type UnsubscribeActionType } from '../entities/unsubscribe-event.entity';

@Controller('api/noise')
export class NoiseController {
  constructor(
    private readonly noiseService: NoiseService,
    private readonly principalService: PrincipalService,
  ) {}

  @Get('senders')
  async listSenders(@Req() req: Request, @Query('limit') limit?: string) {
    const userId = await this.getUserId(req);
    const parsedLimit = limit ? Number(limit) : 30;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 30;
    return this.noiseService.listSenderProfiles(userId, safeLimit);
  }

  @Post('evaluate')
  async evaluate(@Req() req: Request) {
    const userId = await this.getUserId(req);
    return this.noiseService.evaluateSenders(userId);
  }

  @Post('block')
  async block(
    @Req() req: Request,
    @Body()
    body: {
      senderProfileId?: string;
      matchType?: BlockRuleMatchType;
      action?: BlockRuleAction;
    },
  ) {
    const userId = await this.getUserId(req);
    if (!body.senderProfileId || !body.action) {
      return { created: false };
    }
    return this.noiseService.createBlockRule({
      userId,
      senderProfileId: body.senderProfileId,
      matchType: body.matchType,
      action: body.action,
    });
  }

  @Post('unsubscribe/plan')
  async plan(
    @Req() req: Request,
    @Body() body: { senderProfileIds?: string[] },
  ) {
    const userId = await this.getUserId(req);
    const ids = Array.isArray(body.senderProfileIds)
      ? body.senderProfileIds.filter(Boolean)
      : [];
    return this.noiseService.buildUnsubscribePlan(userId, ids);
  }

  @Post('unsubscribe/event')
  async event(
    @Req() req: Request,
    @Body()
    body: {
      senderProfileId?: string;
      actionType?: UnsubscribeActionType;
      metadata?: Record<string, unknown>;
    },
  ) {
    const userId = await this.getUserId(req);
    if (!body.senderProfileId || !body.actionType) {
      return { recorded: false };
    }
    return this.noiseService.recordUnsubscribeEvent({
      userId,
      senderProfileId: body.senderProfileId,
      actionType: body.actionType,
      metadata: body.metadata ?? null,
    });
  }

  private async getUserId(req: Request) {
    const principal = await this.principalService.getPrincipal(req);
    if (!principal) {
      throw new UnauthorizedException();
    }
    return principal.id;
  }
}
