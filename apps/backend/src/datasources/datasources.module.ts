import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsModule } from '@server/contacts/contacts.module';
import { JobsModule } from '@server/jobs/jobs.module';
import { EmailAnalysis } from '@server/llm/email-analysis.entity';
import { ThreadAnalysis } from '@server/llm/thread-analysis.entity';
import { TrpcModule } from '@server/trpc/trpc.module';
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
