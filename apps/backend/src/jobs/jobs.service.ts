import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DummyPayload, Queues } from './queues';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(Queues.DUMMY) private dummyQueue: Queue<DummyPayload>,
  ) {}

  async addDummyJob() {
    await this.dummyQueue.add('dummy', {
      ping: 'dummy',
    });
  }
}
