import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { StoryService } from './story.service';

@Injectable()
export class StoryRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly storyService: StoryService,
  ) {}

  public buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'List stories',
        })
        .use(authRequired)
        .query(({ ctx }) => {
          return this.storyService.listStories(ctx.user.id);
        }),

      create: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Create a new story',
        })
        .use(authRequired)
        .mutation(({ ctx }) => {
          return this.storyService.createStory(ctx.user.id);
        }),

      start: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Start a new story (streaming)',
        })
        .use(authRequired)
        .mutation(({ ctx }) => {
          return this.storyService.startStory(ctx.user.id);
        }),

      get: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Get story with pages',
        })
        .use(authRequired)
        .input(
          z.object({
            storyId: z.string().uuid(),
          }),
        )
        .query(({ ctx, input }) => {
          return this.storyService.getStory(ctx.user.id, input.storyId);
        }),

      choose: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Continue story with a choice',
        })
        .use(authRequired)
        .input(
          z.object({
            storyId: z.string().uuid(),
            choiceId: z.string().min(1),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.storyService.choosePath({
            userId: ctx.user.id,
            storyId: input.storyId,
            choiceId: input.choiceId,
          });
        }),

      streamPage: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Stream story page text from LLM',
        })
        .use(authRequired)
        .input(
          z.object({
            storyId: z.string().uuid(),
            choiceId: z.string().min(1).optional().nullable(),
          }),
        )
        .query(({ ctx, input }) => {
          return this.storyService.streamPage({
            userId: ctx.user.id,
            storyId: input.storyId,
            choiceId: input.choiceId ?? null,
          });
        }),

      generateMedia: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Generate media assets for a story page',
        })
        .use(authRequired)
        .input(
          z.object({
            storyId: z.string().uuid(),
            pageId: z.string().uuid(),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.storyService.generatePageMedia({
            userId: ctx.user.id,
            storyId: input.storyId,
            pageId: input.pageId,
          });
        }),

      finish: this.trpc.procedure
        .meta({
          tags: ['Story'],
          summary: 'Finish story with a title',
        })
        .use(authRequired)
        .input(
          z.object({
            storyId: z.string().uuid(),
            title: z.string().trim().min(1),
          }),
        )
        .mutation(({ ctx, input }) => {
          return this.storyService.finishStory({
            userId: ctx.user.id,
            storyId: input.storyId,
            title: input.title,
          });
        }),
    });
  }
}
