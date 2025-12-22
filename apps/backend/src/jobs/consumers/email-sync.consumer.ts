import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '@server/integrations/integrations.service';
import { Job } from 'bullmq';
import { EmailSyncPayload, Queues } from '../queues';

@Processor(Queues.EMAIL_SYNC)
@Injectable()
export class EmailSyncConsumer extends WorkerHost {
  constructor(private readonly integrationsService: IntegrationsService) {
    super();
  }

  async process(job: Job<EmailSyncPayload, unknown, string>) {
    return this.integrationsService.syncEmailConnection(job.data);
  }
}
