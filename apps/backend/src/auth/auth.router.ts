import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { TrpcService } from '@server/trpc/trpc.service';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { authRequired } from '@server/trpc/trpc.middleware';

@Injectable()
export class AuthRouterBuilder implements RouterBuilder {
  constructor(private readonly trpc: TrpcService) {}

  public buildRouter() {
    return this.trpc.router({
      me: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return ctx.user;
      }),

      // /**
      //  *
      //  */
      // signin: this.trpc.procedure
      //   .use(authRequired)
      //   .mutation(async ({ ctx }) => {
      //     return await this.authService.login(ctx.user.uid);
      //   }),

      // /**
      //  *
      //  */
      // signout: this.trpc.procedure.use(authRequired).mutation(() => {}),

      // /**
      //  *
      //  */
      // signup: this.trpc.procedure
      //   .use(authRequired)
      //   .mutation(async ({ ctx }) => {
      //     return await this.authService.signup({
      //       ...ctx.user!,
      //     });
      //   }),
      // sentry: this.trpc.procedure.use(authRequired).query(async ({ ctx }) => {
      //   throw new Error('Sentry Example API Route Nestjs Error');
      //   return await this.authService.login(ctx.user.uid);
      // }),
    });
  }
}
