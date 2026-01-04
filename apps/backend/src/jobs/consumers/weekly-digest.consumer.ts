import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NoiseService } from '@server/noise/services/noise.service';
import { Job } from 'bullmq';
import { Queues, WeeklyDigestPayload } from '../queues';

@Processor(Queues.WEEKLY_DIGEST)
@Injectable()
export class WeeklyDigestConsumer extends WorkerHost {
  constructor(private readonly noiseService: NoiseService) {
    super();
  }

  async process(_job: Job<WeeklyDigestPayload, unknown, string>) {
    return this.noiseService.processWeeklyDigest();
  }
}
