import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { WorkflowService } from '../services/workflow.service';

@Injectable()
export class WorkflowRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly workflowService: WorkflowService,
  ) {}

  buildRouter() {
    const webhookConfigSchema = z.object({
      url: z.string().url(),
      method: z.enum(['POST', 'PUT', 'PATCH', 'GET', 'DELETE']).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.string().optional(),
    });

    return this.trpc.router({
      list: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.workflowService.listRules(ctx.user.id);
      }),
      create: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            name: z.string().min(1),
            guidelines: z.string().min(1),
            outputTags: z.array(z.string()).optional(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.workflowService.createRule({
            userId: ctx.user.id,
            name: input.name,
            guidelines: input.guidelines,
            outputTags: input.outputTags,
          });
        }),
      triggersList: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return this.workflowService.listTriggers(ctx.user.id);
      }),
      triggerCreate: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            name: z.string().min(1),
            conditions: z.string().min(1),
            action: z.object({
              type: z.literal('webhook'),
              config: webhookConfigSchema,
            }),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.workflowService.createTrigger({
            userId: ctx.user.id,
            name: input.name,
            conditions: input.conditions,
            action: input.action,
          });
        }),
      triggerUpdate: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            triggerId: z.string().uuid(),
            name: z.string().min(1).optional(),
            conditions: z.string().min(1).optional(),
            action: z
              .object({
                type: z.literal('webhook'),
                config: webhookConfigSchema,
              })
              .optional(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.workflowService.updateTrigger({
            userId: ctx.user.id,
            triggerId: input.triggerId,
            name: input.name,
            conditions: input.conditions,
            action: input.action,
          });
        }),
      triggerPause: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            triggerId: z.string().uuid(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.workflowService.setTriggerStatus({
            userId: ctx.user.id,
            triggerId: input.triggerId,
            status: 'paused',
          });
        }),
      triggerResume: this.trpc.procedure
        .use(authRequired)
        .input(
          z.object({
            triggerId: z.string().uuid(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.workflowService.setTriggerStatus({
            userId: ctx.user.id,
            triggerId: input.triggerId,
            status: 'active',
          });
        }),
    });
  }
}
