import { INestApplication, Injectable } from '@nestjs/common';
// import { AccountRouterBuilder } from '@server/account/account.router';
import { AuthRouterBuilder } from '@server/auth/auth.router';
import { ContactsRouterBuilder } from '@server/contacts/contacts.router';
import { DatasourcesRouterBuilder } from '@server/datasources/datasources.router';
import { DigestRouterBuilder } from '@server/digest/digest.router';
import { LlmRouterBuilder } from '@server/llm/llm.router';
import { NoiseRouterBuilder } from '@server/noise/noise.router';
import { TrpcService } from '@server/trpc/trpc.service';
import { WorkflowRouterBuilder } from '@server/workflow/routers/workflow.router';
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
  contactsRouter: ContactsRouterBuilder,
  datasourcesRouter: DatasourcesRouterBuilder,
  digestRouter: DigestRouterBuilder,
  llmRouter: LlmRouterBuilder,
  noiseRouter: NoiseRouterBuilder,
  workflowRouter: WorkflowRouterBuilder,
) => {
  return trpc.router({
    auth: authRouter.buildRouter(),
    contacts: contactsRouter.buildRouter(),
    // account: this.accountRouter.buildRouter(),
    // user: this.userRouter.buildRouter(),
    datasources: datasourcesRouter.buildRouter(),
    digests: digestRouter.buildRouter(),
    llm: llmRouter.buildRouter(),
    noise: noiseRouter.buildRouter(),
    workflow: workflowRouter.buildRouter(),
    // checkout: this.checkoutRouter.buildRouter(),
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
    private readonly contactsRouter: ContactsRouterBuilder,
    private readonly datasourcesRouter: DatasourcesRouterBuilder,
    private readonly digestRouter: DigestRouterBuilder,
    private readonly llmRouter: LlmRouterBuilder,
    private readonly noiseRouter: NoiseRouterBuilder,
    private readonly workflowRouter: WorkflowRouterBuilder,
    // private readonly checkoutRouter: CheckoutRouterBuilder,
  ) {
    this.appRouter = createAppRouter(
      this.trpc,
      this.authRouter,
      this.contactsRouter,
      this.datasourcesRouter,
      this.digestRouter,
      this.llmRouter,
      this.noiseRouter,
      this.workflowRouter,
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
