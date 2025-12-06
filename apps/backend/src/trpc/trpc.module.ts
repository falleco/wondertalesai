import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from '@server/account/account.module';
import { AuthModule } from '@server/auth/auth.module';
import { TrpcRouter } from '@server/trpc/trpc.router';
import { TrpcService } from '@server/trpc/trpc.service';
import { PrincipalService } from '../auth/principal.service';
// import { AuthModule } from '@server/auth/auth.module';
// import { UserModule } from '@server/user/user.module';
// import { IntegrationsModule } from '@server/integrations/integrations.module';
// import { LLMModule } from '@server/llm/llm.module';
// import {CheckoutModule} from "@server/checkout/checkout.module";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AccountModule),
    // forwardRef(() => UserModule),
    // forwardRef(() => IntegrationsModule),
    // forwardRef(() => LLMModule),
    // forwardRef(() => CheckoutModule),
  ],
  controllers: [],
  exports: [TrpcService],
  providers: [TrpcService, TrpcRouter, PrincipalService],
})
export class TrpcModule {}
