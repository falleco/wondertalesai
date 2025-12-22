import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '@server/jobs/jobs.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLabel } from './email-label.entity';
import { EmailMessage } from './email-message.entity';
import { EmailMessageLabel } from './email-message-label.entity';
import { EmailParticipant } from './email-participant.entity';
import { EmailThread } from './email-thread.entity';
import { IntegrationConnection } from './integration-connection.entity';
import { IntegrationOauthState } from './integration-oauth-state.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsRouterBuilder } from './integrations.router';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    forwardRef(() => JobsModule),
    TypeOrmModule.forFeature([
      IntegrationConnection,
      IntegrationOauthState,
      EmailThread,
      EmailMessage,
      EmailParticipant,
      EmailLabel,
      EmailMessageLabel,
      EmailAttachment,
    ]),
  ],
  providers: [IntegrationsService, IntegrationsRouterBuilder],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, IntegrationsRouterBuilder],
})
export class IntegrationsModule {}
