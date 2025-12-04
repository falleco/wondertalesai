import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigurationType } from './configuration';

@Injectable()
export class CacheConfigFactory implements CacheOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createCacheOptions(): CacheModuleOptions {
    const redisConfig =
      this.configService.getOrThrow<AppConfigurationType['redis']>('redis');

    return {
      url: redisConfig.url,
      ttl: redisConfig.ttl,
    };
  }
}
