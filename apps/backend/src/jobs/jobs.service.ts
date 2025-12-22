import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AppConfigurationType } from '@server/config/configuration';
import { Queue } from 'bullmq';
import { DummyPayload, Queues, SendEmailPayload } from './queues';

@Injectable()
export class JobsService {
  private logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(Queues.DUMMY) private dummyQueue: Queue<DummyPayload>,
    @InjectQueue(Queues.EMAIL) private emailQueue: Queue<SendEmailPayload>,
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {}

  async addDummyJob() {
    await this.dummyQueue.add('dummy', {
      ping: 'dummy',
    });
  }

  async enqueueEmail(payload: SendEmailPayload) {
    const emailConfig =
      this.configService.get<AppConfigurationType['email']>('email');
    if (!emailConfig?.apiKey) {
      this.logger.log(`Sending email skipped: ${JSON.stringify(payload)}`);
      return;
    }
    await this.emailQueue.add('send-email', payload);
  }
}
