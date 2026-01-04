import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@server/auth/auth.module';
import { User } from '@server/auth/entities/User';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { EmailThread } from '@server/datasources/email-thread.entity';
import { JobsModule } from '@server/jobs/jobs.module';
import { Queues } from '@server/jobs/queues';
import { LlmModule } from '@server/llm/llm.module';
import { UserPreferences } from '@server/noise/entities/user-preferences.entity';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';
import { DigestItem } from './digest-item.entity';
import { DigestPreferencesController } from './digest-preferences.controller';
import { DigestRun } from './digest-run.entity';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => JobsModule),
    forwardRef(() => LlmModule),
    TypeOrmModule.forFeature([
      DigestRun,
      DigestItem,
      UserPreferences,
      EmailMessage,
      EmailParticipant,
      EmailThread,
      DatasourceConnection,
      User,
    ]),
    BullModule.registerQueue({
      name: Queues.EMAIL,
    }),
  ],
  providers: [DigestService],
  controllers: [DigestController, DigestPreferencesController],
  exports: [DigestService],
})
export class DigestModule {}
