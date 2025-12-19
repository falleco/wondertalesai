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

@Injectable()
export class AuthRouterBuilder implements RouterBuilder {
  constructor(private readonly trpc: TrpcService) {}

  public buildRouter() {
    return this.trpc.router({
      magicLink: this.trpc.procedure
        .input(MagicLinkInput)
        .mutation(({ input }) => {
          console.log('sending magicLink to', input);
        }),

      me: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return ctx.user;
      }),
    });
  }
}
