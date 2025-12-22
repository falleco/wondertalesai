import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '@server/jobs/jobs.module';
import { JobsService } from '@server/jobs/jobs.service';
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
import { ProfileService } from './profile.service';

@Module({
  imports: [
    RedisModule,
    JobsModule,
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
      imports: [JobsModule],
      useFactory: (
        redisService: RedisService,
        jobsService: JobsService,
        configService: ConfigService,
      ) => ({
        auth: new AuthService(
          redisService,
          jobsService,
          configService,
        ).getAuth(),
      }),
      inject: [RedisService, JobsService, ConfigService],
    }),
  ],
  providers: [AuthService, PrincipalService, AuthRouterBuilder, ProfileService],
  exports: [PrincipalService, AuthRouterBuilder],
  controllers: [AuthController],
})
export class AuthModule {}
