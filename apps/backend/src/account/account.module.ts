import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrpcModule } from '@server/trpc/trpc.module';
import { AccountEntity } from './account.entity';
import { AccountRouterBuilder } from './account.router';
import { AccountService } from './account.service';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([AccountEntity]),
  ],
  providers: [AccountService, AccountRouterBuilder],
  exports: [AccountRouterBuilder],
})
export class AccountModule {}
