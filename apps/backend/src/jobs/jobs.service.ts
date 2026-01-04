import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AppConfigurationType } from '@server/config/configuration';
import { Queue } from 'bullmq';
import {
  DigestRunPayload,
  DummyPayload,
  GmailSyncPayload,
  JmapSyncPayload,
  LlmAnalysisPayload,
  Queues,
  SendEmailPayload,
  WeeklyDigestPayload,
} from './queues';

@Injectable()
export class JobsService implements OnModuleInit {
  private logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(Queues.DUMMY) private dummyQueue: Queue<DummyPayload>,
    @InjectQueue(Queues.EMAIL) private emailQueue: Queue<SendEmailPayload>,
    @InjectQueue(Queues.GMAIL_SYNC)
    private gmailSyncQueue: Queue<GmailSyncPayload>,
    @InjectQueue(Queues.JMAP_SYNC)
    private jmapSyncQueue: Queue<JmapSyncPayload>,
    @InjectQueue(Queues.WEEKLY_DIGEST)
    private weeklyDigestQueue: Queue<WeeklyDigestPayload>,
    @InjectQueue(Queues.DIGEST_RUN)
    private digestRunQueue: Queue<DigestRunPayload>,
    @InjectQueue(Queues.LLM_ANALYSIS)
    private llmAnalysisQueue: Queue<LlmAnalysisPayload>,
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {}

  async onModuleInit() {
    await this.weeklyDigestQueue.add(
      'weekly-digest',
      { runAt: new Date().toISOString() },
      {
        repeat: { pattern: '0 9 * * 1' },
        jobId: 'weekly-digest',
      },
    );

    await this.digestRunQueue.add(
      'digest-run',
      { runAt: new Date().toISOString() },
      {
        repeat: { pattern: '*/30 * * * *' },
        jobId: 'digest-run',
      },
    );
  }

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

  async enqueueGmailSync(payload: GmailSyncPayload) {
    await this.gmailSyncQueue.add('gmail-sync', payload);
  }

  async enqueueJmapSync(payload: JmapSyncPayload) {
    await this.jmapSyncQueue.add('jmap-sync', payload);
  }

  async enqueueLlmAnalysis(payload: LlmAnalysisPayload) {
    await this.llmAnalysisQueue.add('llm-analysis', payload);
  }
}
