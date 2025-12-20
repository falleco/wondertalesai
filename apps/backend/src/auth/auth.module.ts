import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@server/redis/redis.module';
import { RedisService } from '@server/redis/redis.service';
import { TrpcModule } from '@server/trpc/trpc.module';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthController } from './auth.controller';
import { AuthRouterBuilder } from './auth.router';
import { AuthService } from './auth.service';
import { Account } from './entities/Account';
import { Invitation } from './entities/Invitation';
import { Jwks } from './entities/Jwks';
import { Member } from './entities/Member';
import { Organization } from './entities/Organization';
import { Passkey } from './entities/Passkey';
import { TwoFactor } from './entities/TwoFactor';
import { User } from './entities/User';
import { Verification } from './entities/Verification';
import { PrincipalService } from './principal.service';

@Module({
  imports: [
    RedisModule,
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([
      Account,
      Invitation,
      Jwks,
      Member,
      Organization,
      Passkey,
      TwoFactor,
      User,
      Verification,
    ]),
    BetterAuthModule.forRootAsync({
      useFactory: (redisService: RedisService) => {
        return {
          auth: new AuthService(redisService).getAuth(),
        };
      },
      inject: [RedisService],
    }),
  ],
  providers: [AuthService, PrincipalService, AuthRouterBuilder],
  exports: [PrincipalService, AuthRouterBuilder],
  controllers: [AuthController],
})
export class AuthModule {}
