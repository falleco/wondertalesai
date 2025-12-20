import {
  BullRootModuleOptions,
  SharedBullConfigurationFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { RedisService } from '@server/redis/redis.service';

@Injectable()
export class BullConfigFactory implements SharedBullConfigurationFactory {
  constructor(private readonly redisService: RedisService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    return {
      connection: this.redisService.redis,
    };
  }
}
