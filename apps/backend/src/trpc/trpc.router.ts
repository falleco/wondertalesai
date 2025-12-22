import { INestApplication, Injectable } from '@nestjs/common';
// import { AccountRouterBuilder } from '@server/account/account.router';
import { AuthRouterBuilder } from '@server/auth/auth.router';
import { IntegrationsRouterBuilder } from '@server/integrations/integrations.router';
import { TrpcService } from '@server/trpc/trpc.service';
import * as trpcExpress from '@trpc/server/adapters/express';
import { PrincipalService } from '../auth/principal.service';
// import { AuthRouterBuilder } from '@server/auth/auth.router';
import { generateInjectedContext } from './trpc.context';
// import { UserRouterBuilder } from '@server/user/user.router';
// import { IntegrationsRouterBuilder } from '@server/integrations/integrations.router';
// import { LLMRouterBuilder } from '@server/llm/llm.router';
// import {CheckoutRouterBuilder} from "@server/checkout/checkout.router";

export const createAppRouter = (
  trpc: TrpcService,
  authRouter: AuthRouterBuilder,
  integrationsRouter: IntegrationsRouterBuilder,
) => {
  return trpc.router({
    auth: authRouter.buildRouter(),
    // account: this.accountRouter.buildRouter(),
    // user: this.userRouter.buildRouter(),
    integrations: integrationsRouter.buildRouter(),
    // llm: this.llmRouter.buildRouter(),
    // checkout: this.checkoutRouter.buildRouter(),
    ping: trpc.procedure.query(() => {
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
    private readonly integrationsRouter: IntegrationsRouterBuilder,
    // private readonly llmRouter: LLMRouterBuilder,
    // private readonly checkoutRouter: CheckoutRouterBuilder,
  ) {
    this.appRouter = createAppRouter(
      this.trpc,
      this.authRouter,
      this.integrationsRouter,
    );
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
