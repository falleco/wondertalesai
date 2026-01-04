import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { BullConfigFactory } from '@server/config/queue.configuration';
import { DatasourcesModule } from '@server/datasources/datasources.module';
import { DigestModule } from '@server/digest/digest.module';
import { LlmModule } from '@server/llm/llm.module';
import { NoiseModule } from '@server/noise/noise.module';
import { DigestRunConsumer } from './consumers/digest-run.consumer';
import { DummConsumer } from './consumers/dummy.consumer';
import { EmailConsumer } from './consumers/email.consumer';
import { GmailSyncConsumer } from './consumers/gmail-sync.consumer';
import { JmapSyncConsumer } from './consumers/jmap-sync.consumer';
import { LlmAnalysisConsumer } from './consumers/llm-analysis.consumer';
import { WeeklyDigestConsumer } from './consumers/weekly-digest.consumer';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Queues } from './queues';

@Module({
  imports: [
    BullModule.forRootAsync({
      useClass: BullConfigFactory,
    }),
    forwardRef(() => DatasourcesModule),
    forwardRef(() => DigestModule),
    forwardRef(() => LlmModule),
    forwardRef(() => NoiseModule),
    // Available Queues
    BullModule.registerQueue({
      name: Queues.DUMMY,
    }),
    BullModule.registerQueue({
      name: Queues.EMAIL,
    }),
    BullModule.registerQueue({
      name: Queues.GMAIL_SYNC,
    }),
    BullModule.registerQueue({
      name: Queues.JMAP_SYNC,
    }),
    BullModule.registerQueue({
      name: Queues.WEEKLY_DIGEST,
    }),
    BullModule.registerQueue({
      name: Queues.DIGEST_RUN,
    }),
    BullModule.registerQueue({
      name: Queues.LLM_ANALYSIS,
    }),
    BullBoardModule.forFeature({
      name: Queues.DUMMY,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.GMAIL_SYNC,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.JMAP_SYNC,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.WEEKLY_DIGEST,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.DIGEST_RUN,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.LLM_ANALYSIS,
      adapter: BullMQAdapter,
    }),
    // Admin
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter, // Or FastifyAdapter from `@bull-board/fastify`
    }),
  ],
  providers: [
    JobsService,
    DummConsumer,
    DigestRunConsumer,
    EmailConsumer,
    GmailSyncConsumer,
    JmapSyncConsumer,
    LlmAnalysisConsumer,
    WeeklyDigestConsumer,
  ],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
