import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { NoiseService } from './services/noise.service';

const blockRuleActions = ['archive', 'tagOnly', 'moveToNoise'] as const;
const blockRuleMatchTypes = [
  'senderEmail',
  'senderDomain',
  'subjectContains',
  'fromNameContains',
] as const;
const unsubscribeActionTypes = [
  'opened_link',
  'sent_mailto',
  'blocked',
  'ignored',
  'marked_done',
] as const;

@Injectable()
export class NoiseRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly noiseService: NoiseService,
  ) {}

  buildRouter() {
    return this.trpc.router({
      senders: this.trpc.procedure
        .use(authRequired)
        .input(
          z
            .object({
              limit: z.number().int().min(1).max(100).optional(),
            })
            .optional(),
        )
        .query(({ ctx, input }) => {
          return this.noiseService.listSenderProfiles(
            ctx.user.id,
            input?.limit,
          );
        }),
      evaluate: this.trpc.procedure.use(authRequired).mutation(({ ctx }) => {
        return this.noiseService.evaluateSenders(ctx.user.id);
      }),
      block: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            senderProfileId: z.string().uuid(),
            matchType: z.enum(blockRuleMatchTypes).optional(),
            action: z.enum(blockRuleActions),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.noiseService.createBlockRule({
            userId: ctx.user.id,
            senderProfileId: input.senderProfileId,
            matchType: input.matchType,
            action: input.action,
          });
        }),
      unsubscribePlan: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            senderProfileIds: z.array(z.string().uuid()).optional(),
          }),
        )
        .mutation(({ ctx, input }) => {
          const ids = Array.isArray(input.senderProfileIds)
            ? input.senderProfileIds.filter(Boolean)
            : [];
          return this.noiseService.buildUnsubscribePlan(ctx.user.id, ids);
        }),
      unsubscribeEvent: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            senderProfileId: z.string().uuid(),
            actionType: z.enum(unsubscribeActionTypes),
            metadata: z.record(z.string(), z.unknown()).optional(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.noiseService.recordUnsubscribeEvent({
            userId: ctx.user.id,
            senderProfileId: input.senderProfileId,
            actionType: input.actionType,
            metadata: input.metadata ?? null,
          });
        }),
      preferences: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.noiseService.getPreferences(ctx.user.id);
      }),
      updatePreferences: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            weeklyCleanupDigestEnabled: z.boolean(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.noiseService.updatePreferences(ctx.user.id, {
            weeklyCleanupDigestEnabled: input.weeklyCleanupDigestEnabled,
          });
        }),
    });
  }
}
