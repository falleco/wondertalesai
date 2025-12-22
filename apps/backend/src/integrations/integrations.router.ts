import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { IntegrationsService } from './integrations.service';

@Injectable()
export class IntegrationsRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.integrationsService.listConnections(ctx.user.id);
      }),
      remove: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            connectionId: z.string().uuid(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.integrationsService.removeConnection(
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
          return this.integrationsService.createGmailAuthUrl(
            ctx.user.id,
            input?.redirectTo,
          );
        }),
    });
  }
}
