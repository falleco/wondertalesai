import { RedisHealthIndicator } from '@liaoliaots/nestjs-redis-health';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisService } from '@server/redis/redis.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Common')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly redisService: RedisService,
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
          client: this.redisService.redis,
          timeout: 500,
        }),
    ]);
  }
}
