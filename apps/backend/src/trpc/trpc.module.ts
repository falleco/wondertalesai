import { forwardRef, Module } from '@nestjs/common';
// import { AccountModule } from '@server/account/account.module';
import { AuthModule } from '@server/auth/auth.module';
import { DatasourcesModule } from '@server/datasources/datasources.module';
import { LlmModule } from '@server/llm/llm.module';
import { TrpcRouter } from '@server/trpc/trpc.router';
import { TrpcService } from '@server/trpc/trpc.service';
import { WorkflowModule } from '@server/workflow/workflow.module';
import { PrincipalService } from '../auth/principal.service';
// import { AuthModule } from '@server/auth/auth.module';
// import { UserModule } from '@server/user/user.module';
// import { IntegrationsModule } from '@server/integrations/integrations.module';
// import { LLMModule } from '@server/llm/llm.module';
// import {CheckoutModule} from "@server/checkout/checkout.module";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    // forwardRef(() => AccountModule),
    // forwardRef(() => UserModule),
    forwardRef(() => DatasourcesModule),
    forwardRef(() => LlmModule),
    forwardRef(() => WorkflowModule),
    // forwardRef(() => CheckoutModule),
  ],
  controllers: [],
  exports: [TrpcService],
  providers: [TrpcService, TrpcRouter, PrincipalService],
})
export class TrpcModule {}
