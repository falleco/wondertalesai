import { INestApplication, Injectable } from '@nestjs/common';
import { AuthRouterBuilder } from '@server/auth/auth.router';
import { TrpcService } from '@server/trpc/trpc.service';
import * as trpcExpress from '@trpc/server/adapters/express';
import { PrincipalService } from '../auth/principal.service';
import { generateInjectedContext } from './trpc.context';
// import { AccountRouterBuilder } from '@server/account/account.router';
// import { UserRouterBuilder } from '@server/user/user.router';
// import { CheckoutRouterBuilder } from '@server/checkout/checkout.router';

export const createAppRouter = (
  trpc: TrpcService,
  authRouter: AuthRouterBuilder,
) => {
  return trpc.router({
    auth: authRouter.buildRouter(),
    ping: trpc.procedure
      .meta({
        tags: ['System'],
        summary: 'Health check',
      })
      .query(() => {
        return 'pong';
      }),
  });
};

export type AppRouter = ReturnType<typeof createAppRouter>;

@Injectable()
export class TrpcRouter {
  readonly appRouter: AppRouter;

  constructor(
    private readonly trpc: TrpcService,
    private readonly principalService: PrincipalService,
    private readonly authRouter: AuthRouterBuilder,
    // private readonly accountRouter: AccountRouterBuilder,
    // private readonly userRouter: UserRouterBuilder,
    // private readonly checkoutRouter: CheckoutRouterBuilder,
  ) {
    this.appRouter = createAppRouter(this.trpc, this.authRouter);
  }

  async applyMiddleware(app: INestApplication) {
    app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: this.appRouter,
        createContext: generateInjectedContext(this.principalService),
      }),
    );
  }
}
