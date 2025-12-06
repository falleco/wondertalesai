import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { AccountService } from './account.service';

@Injectable()
export class AccountRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly accountService: AccountService,
  ) {}

  public buildRouter() {
    return this.trpc.router({
      /**
       *
       */
      signUpOrSignIn: this.trpc.procedure
        .use(authRequired)
        .mutation(async ({ ctx }) => {
          return await this.accountService.signUpOrSignIn(ctx.user);
        }),

      /**
       *
       */
      signout: this.trpc.procedure.use(authRequired).mutation(() => {}),
    });
  }
}
