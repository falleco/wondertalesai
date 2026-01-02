import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '@server/jobs/jobs.module';
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

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    forwardRef(() => JobsModule),
    TypeOrmModule.forFeature([
      DatasourceConnection,
      DatasourceOauthState,
      EmailThread,
      EmailMessage,
      EmailParticipant,
      EmailLabel,
      EmailMessageLabel,
      EmailAttachment,
    ]),
  ],
  providers: [DatasourcesService, DatasourcesRouterBuilder],
  controllers: [DatasourcesController],
  exports: [DatasourcesService, DatasourcesRouterBuilder],
})
export class DatasourcesModule {}
