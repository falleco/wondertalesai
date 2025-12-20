import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import z from 'zod';

const MagicLinkInput = z.object({
  email: z.string(),
  token: z.string(),
  url: z.string(),
});

export const createAuthRouter = (trpc: TrpcService) => {
  return trpc.router({
    magicLink: trpc.procedure.input(MagicLinkInput).mutation(({ input }) => {
      console.log('sending magicLink to', input);
    }),

    me: trpc.procedure.use(authRequired).query(({ ctx }) => {
      return ctx.user;
    }),
  });
};

export type AuthRouter = ReturnType<typeof createAuthRouter>;

@Injectable()
export class AuthRouterBuilder implements RouterBuilder<AuthRouter> {
  constructor(private readonly trpc: TrpcService) {}

  public buildRouter(): AuthRouter {
    return createAuthRouter(this.trpc);
  }
}
