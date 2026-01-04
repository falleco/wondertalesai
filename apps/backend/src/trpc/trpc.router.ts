import { INestApplication, Injectable } from '@nestjs/common';
// import { AccountRouterBuilder } from '@server/account/account.router';
import { AuthRouterBuilder } from '@server/auth/auth.router';
import { ContactsRouterBuilder } from '@server/contacts/contacts.router';
import { DatasourcesRouterBuilder } from '@server/datasources/datasources.router';
import { LlmRouterBuilder } from '@server/llm/llm.router';
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
  llmRouter: LlmRouterBuilder,
  workflowRouter: WorkflowRouterBuilder,
) => {
  return trpc.router({
    auth: authRouter.buildRouter(),
    contacts: contactsRouter.buildRouter(),
    // account: this.accountRouter.buildRouter(),
    // user: this.userRouter.buildRouter(),
    datasources: datasourcesRouter.buildRouter(),
    llm: llmRouter.buildRouter(),
    workflow: workflowRouter.buildRouter(),
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
    private readonly contactsRouter: ContactsRouterBuilder,
    private readonly datasourcesRouter: DatasourcesRouterBuilder,
    private readonly llmRouter: LlmRouterBuilder,
    private readonly workflowRouter: WorkflowRouterBuilder,
    // private readonly checkoutRouter: CheckoutRouterBuilder,
  ) {
    this.appRouter = createAppRouter(
      this.trpc,
      this.authRouter,
      this.contactsRouter,
      this.datasourcesRouter,
      this.llmRouter,
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
