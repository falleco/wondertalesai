import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { type DummyPayload, Queues } from '../queues';

@Processor(Queues.DUMMY)
export class DummConsumer extends WorkerHost {
  async process(job: Job<DummyPayload, unknown, string>): Promise<unknown> {
    let progress = 0;
    console.log('Processing dummy job', job.data);
    for (let i = 0; i < 100; i++) {
      await job.updateProgress(progress++);
    }
    return {};
  }
}
