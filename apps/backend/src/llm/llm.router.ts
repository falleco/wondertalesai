import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { LlmService } from './services/llm.service';

@Injectable()
export class LlmRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly llmService: LlmService,
  ) {}

  buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.llmService.listIntegrations(ctx.user.id);
      }),
      create: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            provider: z.enum(['openai', 'ollama']),
            model: z.string().min(1),
            apiKey: z.string().optional(),
            baseUrl: z.string().optional(),
            isDefault: z.boolean().optional(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.llmService.createIntegration({
            userId: ctx.user.id,
            provider: input.provider,
            model: input.model,
            apiKey: input.apiKey,
            baseUrl: input.baseUrl,
            isDefault: input.isDefault,
          });
        }),
      remove: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            integrationId: z.string().uuid(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.llmService.removeIntegration(
            ctx.user.id,
            input.integrationId,
          );
        }),
    });
  }
}
