import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { DigestService } from '@server/digest/digest.service';
import { Job } from 'bullmq';
import { DigestRunPayload, Queues } from '../queues';

@Processor(Queues.DIGEST_RUN)
@Injectable()
export class DigestRunConsumer extends WorkerHost {
  constructor(private readonly digestService: DigestService) {
    super();
  }

  async process(_job: Job<DigestRunPayload, unknown, string>) {
    return this.digestService.runScheduledDigests();
  }
}
