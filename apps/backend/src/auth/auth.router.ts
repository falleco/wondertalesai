import { Injectable } from '@nestjs/common';
import { ProfileService } from '@server/auth/profile.service';
import { JobsService } from '@server/jobs/jobs.service';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import z from 'zod';

const MagicLinkInput = z.object({
  email: z.string(),
  token: z.string(),
  url: z.string(),
});

const UpdateProfileInput = z.object({
  fullName: z.string().trim().min(1),
  image: z.string().nullable().optional(),
});

export const createAuthRouter = (
  trpc: TrpcService,
  jobsService: JobsService,
  profileService: ProfileService,
) => {
  return trpc.router({
    magicLink: trpc.procedure
      .input(MagicLinkInput)
      .mutation(async ({ input }) => {
        await jobsService.enqueueEmail({
          templateId: 'magic-link',
          to: input.email,
          payload: { email: input.email, token: input.token, url: input.url },
        });
      }),

    me: trpc.procedure.use(authRequired).query(({ ctx }) => {
      return ctx.user;
    }),

    updateProfile: trpc.procedure
      .use(authRequired)
      .input(UpdateProfileInput)
      .mutation(async ({ ctx, input }) => {
        return await profileService.updateProfile(ctx.user.id, {
          fullName: input.fullName,
          image: input.image ?? null,
        });
      }),
  });
};

export type AuthRouter = ReturnType<typeof createAuthRouter>;

@Injectable()
export class AuthRouterBuilder implements RouterBuilder<AuthRouter> {
  constructor(
    private readonly trpc: TrpcService,
    private readonly jobsService: JobsService,
    private readonly profileService: ProfileService,
  ) {}

  public buildRouter(): AuthRouter {
    return createAuthRouter(this.trpc, this.jobsService, this.profileService);
  }
}
