import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DataSource } from 'typeorm';
import { PrincipalService } from './principal.service';
import { AuthController } from './auth.controller';
import { AuthRouterBuilder } from './auth.router';
import { TrpcModule } from '@server/trpc/trpc.module';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    BetterAuthModule.forRootAsync({
      useFactory: (dataSource: DataSource) => {
        const authService = new AuthService(dataSource);
        return {
          auth: authService.getAuth(),
        };
      },
      inject: [DataSource],
    }),
  ],
  providers: [AuthService, PrincipalService, AuthRouterBuilder],
  exports: [PrincipalService, AuthRouterBuilder],
  controllers: [AuthController],
})
export class AuthModule {}
