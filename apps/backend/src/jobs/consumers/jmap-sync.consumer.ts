import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { DatasourcesService } from '@server/datasources/datasources.service';
import { Job } from 'bullmq';
import { JmapSyncPayload, Queues } from '../queues';

@Processor(Queues.JMAP_SYNC)
@Injectable()
export class JmapSyncConsumer extends WorkerHost {
  constructor(private readonly datasourcesService: DatasourcesService) {
    super();
  }

  async process(job: Job<JmapSyncPayload, unknown, string>) {
    return this.datasourcesService.syncJmapConnection(job.data);
  }
}
