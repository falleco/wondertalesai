import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { DatasourcesService } from './datasources.service';

@Injectable()
export class DatasourcesRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly datasourcesService: DatasourcesService,
  ) {}

  buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.datasourcesService.listConnections(ctx.user.id);
      }),
      emailInbox: this.trpc.procedure
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
          return this.datasourcesService.getEmailInbox(ctx.user.id, input);
        }),
      remove: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            connectionId: z.string().uuid(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.datasourcesService.removeConnection(
            ctx.user.id,
            input.connectionId,
          );
        }),
      gmailAuthUrl: this.trpc.procedure
        .use(authRequired)
        .input(
          z
            .object({
              redirectTo: z.string().optional(),
            })
            .optional(),
        )
        .mutation(({ ctx, input }) => {
          return this.datasourcesService.createGmailAuthUrl(
            ctx.user.id,
            input?.redirectTo,
          );
        }),
    });
  }
}
