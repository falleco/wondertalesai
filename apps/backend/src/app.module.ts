import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheConfigFactory } from './config/cache.configuration';
import { GetAppConfiguration } from './config/configuration';
import { TypeOrmConfigFactory } from './config/orm.configuration';
import { ExampleModule } from './example/example.module';
import { HealthModule } from './health/health.module';
import { RabbitMQModuleExtension } from './rabbitmq/rabbitmq.module';
import { RedisModule } from './redis/redis.module';
import { TrpcModule } from './trpc/trpc.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [GetAppConfiguration],
    }),
    AuthModule.forRoot({ auth }),
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfigFactory,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigFactory,
    }),
    RedisModule,
    HealthModule,
    RabbitMQModuleExtension,

    ExampleModule,
    TrpcModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
