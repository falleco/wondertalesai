import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@server/auth/auth.module';
import { User } from '@server/auth/entities/User';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { Queues } from '@server/jobs/queues';
import { LlmModule } from '@server/llm/llm.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { BlockRule } from './entities/block-rule.entity';
import { NoiseEvaluationRun } from './entities/noise-evaluation-run.entity';
import { SenderProfile } from './entities/sender-profile.entity';
import { UnsubscribeEvent } from './entities/unsubscribe-event.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { WeeklyDigestLog } from './entities/weekly-digest-log.entity';
import { NoiseRouterBuilder } from './noise.router';
import { NoiseService } from './services/noise.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => LlmModule),
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([
      SenderProfile,
      UnsubscribeEvent,
      BlockRule,
      UserPreferences,
      NoiseEvaluationRun,
      WeeklyDigestLog,
      EmailMessage,
      EmailParticipant,
      DatasourceConnection,
      User,
    ]),
    BullModule.registerQueue({
      name: Queues.EMAIL,
    }),
  ],
  providers: [NoiseService, NoiseRouterBuilder],
  controllers: [],
  exports: [NoiseService, NoiseRouterBuilder],
})
export class NoiseModule {}
