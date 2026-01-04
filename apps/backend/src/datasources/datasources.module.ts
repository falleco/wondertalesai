import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsModule } from '@server/contacts/contacts.module';
import { JobsModule } from '@server/jobs/jobs.module';
import { EmailAnalysis } from '@server/llm/entities/email-analysis.entity';
import { ThreadAnalysis } from '@server/llm/entities/thread-analysis.entity';
import { SenderProfile } from '@server/noise/entities/sender-profile.entity';
import { NoiseModule } from '@server/noise/noise.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { WorkflowRule } from '@server/workflow/entities/workflow-rule.entity';
import { DatasourceConnection } from './datasource-connection.entity';
import { DatasourceOauthState } from './datasource-oauth-state.entity';
import { DatasourcesController } from './datasources.controller';
import { DatasourcesRouterBuilder } from './datasources.router';
import { DatasourcesService } from './datasources.service';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLabel } from './email-label.entity';
import { EmailMessage } from './email-message.entity';
import { EmailMessageLabel } from './email-message-label.entity';
import { EmailParticipant } from './email-participant.entity';
import { EmailThread } from './email-thread.entity';
import { GmailService } from './gmail.service';
import { JmapService } from './jmap.service';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    forwardRef(() => JobsModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => NoiseModule),
    TypeOrmModule.forFeature([
      DatasourceConnection,
      DatasourceOauthState,
      EmailThread,
      EmailMessage,
      EmailParticipant,
      EmailLabel,
      EmailMessageLabel,
      EmailAttachment,
      EmailAnalysis,
      ThreadAnalysis,
      SenderProfile,
      WorkflowRule,
    ]),
  ],
  providers: [
    DatasourcesService,
    DatasourcesRouterBuilder,
    GmailService,
    JmapService,
  ],
  controllers: [DatasourcesController],
  exports: [DatasourcesService, DatasourcesRouterBuilder],
})
export class DatasourcesModule {}
