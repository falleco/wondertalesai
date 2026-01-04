import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { DigestService } from './digest.service';

@Injectable()
export class DigestRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly digestService: DigestService,
  ) {}

  buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure
        .use(authRequired)
        .input(
          z
            .object({
              page: z.number().int().min(1).optional(),
              pageSize: z.number().int().min(1).max(50).optional(),
            })
            .optional(),
        )
        .query(({ ctx, input }) => {
          return this.digestService.listDigests(
            ctx.user.id,
            input?.page,
            input?.pageSize,
          );
        }),
      detail: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            id: z.string().uuid(),
          }),
        )
        .query(({ ctx, input }) => {
          return this.digestService.getDigest(ctx.user.id, input.id);
        }),
      run: this.trpc.procedure
        .use(authRequired)
        .input(
          z
            .object({
              type: z.enum(['daily', 'weekly']).optional(),
            })
            .optional(),
        )
        .mutation(({ ctx, input }) => {
          return this.digestService.runManualDigest(
            ctx.user.id,
            input?.type ?? 'daily',
          );
        }),
      preferences: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.digestService.getDigestPreferences(ctx.user.id);
      }),
      updatePreferences: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            dailyDigestEnabled: z.boolean().optional(),
            dailyDigestTimeLocal: z.string().optional(),
            weeklyDigestEnabled: z.boolean().optional(),
            weeklyDigestDayOfWeek: z.number().int().min(1).max(7).optional(),
            digestTimezone: z.string().optional(),
            digestMaxItems: z.number().int().min(1).max(100).optional(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.digestService.updateDigestPreferences(ctx.user.id, input);
        }),
    });
  }
}
