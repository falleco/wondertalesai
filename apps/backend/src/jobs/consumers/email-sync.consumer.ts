import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { DatasourcesService } from '@server/datasources/datasources.service';
import { Job } from 'bullmq';
import { EmailSyncPayload, Queues } from '../queues';

@Processor(Queues.EMAIL_SYNC)
@Injectable()
export class EmailSyncConsumer extends WorkerHost {
  constructor(private readonly datasourcesService: DatasourcesService) {
    super();
  }

  async process(job: Job<EmailSyncPayload, unknown, string>) {
    return this.datasourcesService.syncEmailConnection(job.data);
  }
}
