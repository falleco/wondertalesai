import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CacheConfigFactory } from './config/cache.configuration';
import { GetAppConfiguration } from './config/configuration';
import { TypeOrmConfigFactory } from './config/orm.configuration';
import { DatasourcesModule } from './datasources/datasources.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { RedisModule } from './redis/redis.module';
import { TrpcModule } from './trpc/trpc.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [GetAppConfiguration],
    }),
    AuthModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfigFactory,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigFactory,
    }),
    RedisModule,
    HealthModule,
    TrpcModule,
    AuthModule,
    JobsModule,
    DatasourcesModule,
    WorkflowModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
