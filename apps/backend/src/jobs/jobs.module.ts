import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { BullConfigFactory } from '@server/config/queue.configuration';
import { DatasourcesModule } from '@server/datasources/datasources.module';
import { LlmModule } from '@server/llm/llm.module';
import { DummConsumer } from './consumers/dummy.consumer';
import { EmailConsumer } from './consumers/email.consumer';
import { EmailSyncConsumer } from './consumers/email-sync.consumer';
import { JmapSyncConsumer } from './consumers/jmap-sync.consumer';
import { LlmAnalysisConsumer } from './consumers/llm-analysis.consumer';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Queues } from './queues';

@Module({
  imports: [
    BullModule.forRootAsync({
      useClass: BullConfigFactory,
    }),
    forwardRef(() => DatasourcesModule),
    forwardRef(() => LlmModule),
    // Available Queues
    BullModule.registerQueue({
      name: Queues.DUMMY,
    }),
    BullModule.registerQueue({
      name: Queues.EMAIL,
    }),
    BullModule.registerQueue({
      name: Queues.EMAIL_SYNC,
    }),
    BullModule.registerQueue({
      name: Queues.JMAP_SYNC,
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
      name: Queues.EMAIL_SYNC,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: Queues.JMAP_SYNC,
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
    EmailConsumer,
    EmailSyncConsumer,
    JmapSyncConsumer,
    LlmAnalysisConsumer,
  ],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
