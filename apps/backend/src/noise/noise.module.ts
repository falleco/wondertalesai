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
import { BlockRule } from './entities/block-rule.entity';
import { NoiseController } from './controllers/noise.controller';
import { NoiseService } from './services/noise.service';
import { NoiseEvaluationRun } from './entities/noise-evaluation-run.entity';
import { PreferencesController } from './controllers/preferences.controller';
import { SenderProfile } from './entities/sender-profile.entity';
import { UnsubscribeEvent } from './entities/unsubscribe-event.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { WeeklyDigestLog } from './entities/weekly-digest-log.entity';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => LlmModule),
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
  providers: [NoiseService],
  controllers: [NoiseController, PreferencesController],
  exports: [NoiseService],
})
export class NoiseModule {}
