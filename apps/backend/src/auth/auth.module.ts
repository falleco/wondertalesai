import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@server/redis/redis.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import Redis from 'ioredis';
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
    RedisModule,
    BetterAuthModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_HOST || 'redis://localhost:6379';
        const redis = new Redis(redisUrl, {
          autoResubscribe: true,
          lazyConnect: true,
        });

        const authService = new AuthService(redis);
        return {
          auth: authService.getAuth(),
        };
      },
      // inject: ['REDIS_CLIENT'],
    }),
  ],
  providers: [AuthService, PrincipalService, AuthRouterBuilder],
  exports: [PrincipalService, AuthRouterBuilder],
  controllers: [AuthController],
})
export class AuthModule {}
