import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { BullConfigFactory } from '@server/config/queue.configuration';
import { IntegrationsModule } from '@server/integrations/integrations.module';
import { DummConsumer } from './consumers/dummy.consumer';
import { EmailConsumer } from './consumers/email.consumer';
import { EmailSyncConsumer } from './consumers/email-sync.consumer';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Queues } from './queues';

@Module({
  imports: [
    BullModule.forRootAsync({
      useClass: BullConfigFactory,
    }),
    forwardRef(() => IntegrationsModule),
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
    // Admin
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter, // Or FastifyAdapter from `@bull-board/fastify`
    }),
  ],
  providers: [JobsService, DummConsumer, EmailConsumer, EmailSyncConsumer],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
