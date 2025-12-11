import { RedisHealthIndicator } from '@liaoliaots/nestjs-redis-health';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import Redis from 'ioredis';

@ApiTags('Common')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  @AllowAnonymous()
  @ApiOperation({
    summary: 'Return the health of the application',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the health of the application',
  })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
      () =>
        this.redisIndicator.checkHealth('redis', {
          type: 'redis',
          client: this.redis,
          timeout: 500,
        }),
    ]);
  }
}
