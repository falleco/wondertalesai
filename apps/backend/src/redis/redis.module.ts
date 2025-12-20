import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (_configService: ConfigService) => {
        const redisUrl = process.env.REDIS_HOST || 'redis://localhost:6379';
        return new Redis(redisUrl, {
          autoResubscribe: true,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
