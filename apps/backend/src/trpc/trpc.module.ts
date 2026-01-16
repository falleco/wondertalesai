import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '@server/auth/auth.module';
import { TrpcRouter } from '@server/trpc/trpc.router';
import { TrpcService } from '@server/trpc/trpc.service';
import { PrincipalService } from '../auth/principal.service';
// import { AccountModule } from '@server/account/account.module';
// import { UserModule } from '@server/user/user.module';
// import { CheckoutModule } from '@server/checkout/checkout.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    // forwardRef(() => AccountModule),
    // forwardRef(() => UserModule),
    // forwardRef(() => CheckoutModule),
  ],
  controllers: [],
  exports: [TrpcService],
  providers: [TrpcService, TrpcRouter, PrincipalService],
})
export class TrpcModule {}
