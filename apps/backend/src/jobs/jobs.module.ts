import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BullConfigFactory } from '@server/config/queue.configuration';
import { DummConsumer } from './consumers/dummy.consumer';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Queues } from './queues';

@Module({
  imports: [
    BullModule.forRootAsync({
      useClass: BullConfigFactory,
    }),
    // Available Queues
    BullModule.registerQueue({
      name: Queues.DUMMY,
    }),
    BullBoardModule.forFeature({
      name: Queues.DUMMY,
      adapter: BullMQAdapter,
    }),
    // Admin
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter, // Or FastifyAdapter from `@bull-board/fastify`
    }),
  ],
  providers: [JobsService, DummConsumer],
  controllers: [JobsController],
})
export class JobsModule {}
