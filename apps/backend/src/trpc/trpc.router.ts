import { INestApplication, Injectable } from '@nestjs/common';
import { AccountRouterBuilder } from '@server/account/account.router';
import { AuthRouterBuilder } from '@server/auth/auth.router';
import { TrpcService } from '@server/trpc/trpc.service';
import * as trpcExpress from '@trpc/server/adapters/express';
import { PrincipalService } from '../auth/principal.service';
// import { AuthRouterBuilder } from '@server/auth/auth.router';
import { generateInjectedContext } from './trpc.context';
// import { UserRouterBuilder } from '@server/user/user.router';
// import { IntegrationsRouterBuilder } from '@server/integrations/integrations.router';
// import { LLMRouterBuilder } from '@server/llm/llm.router';
// import {CheckoutRouterBuilder} from "@server/checkout/checkout.router";

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly principalService: PrincipalService,
    private readonly authRouter: AuthRouterBuilder,
    private readonly accountRouter: AccountRouterBuilder,
    // private readonly userRouter: UserRouterBuilder,
    // private readonly integrationsRouter: IntegrationsRouterBuilder,
    // private readonly llmRouter: LLMRouterBuilder,
    // private readonly checkoutRouter: CheckoutRouterBuilder,
  ) {}

  appRouter = this.trpc.router({
    auth: this.authRouter.buildRouter(),
    account: this.accountRouter.buildRouter(),
    // user: this.userRouter.buildRouter(),
    // integrations: this.integrationsRouter.buildRouter(),
    // llm: this.llmRouter.buildRouter(),
    // checkout: this.checkoutRouter.buildRouter(),
    ping: this.trpc.procedure.query(() => {
      return 'pong';
    }),
  });

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

export type AppRouter = TrpcRouter[`appRouter`];
