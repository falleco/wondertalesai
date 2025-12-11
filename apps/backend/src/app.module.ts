import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CacheConfigFactory } from './config/cache.configuration';
import { GetAppConfiguration } from './config/configuration';
import { TypeOrmConfigFactory } from './config/orm.configuration';
import { HealthModule } from './health/health.module';
import { RabbitMQModuleExtension } from './rabbitmq/rabbitmq.module';
import { RedisModule } from './redis/redis.module';
import { TrpcModule } from './trpc/trpc.module';

@Module({
  imports: [
    RedisModule,
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
    HealthModule,
    RabbitMQModuleExtension,
    TrpcModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
