import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { DatasourcesService } from '@server/datasources/datasources.service';
import { Job } from 'bullmq';
import { GmailSyncPayload, Queues } from '../queues';

@Processor(Queues.GMAIL_SYNC)
@Injectable()
export class GmailSyncConsumer extends WorkerHost {
  constructor(private readonly datasourcesService: DatasourcesService) {
    super();
  }

  async process(job: Job<GmailSyncPayload, unknown, string>) {
    return this.datasourcesService.syncEmailConnection(job.data);
  }
}
