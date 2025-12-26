import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '@server/jobs/jobs.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { AttachmentAnalysis } from './attachment-analysis.entity';
import { EmailAnalysis } from './email-analysis.entity';
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
import { LlmIntegration } from './llm-integration.entity';
import { LlmUsage } from './llm-usage.entity';
import { ThreadAnalysis } from './thread-analysis.entity';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    forwardRef(() => JobsModule),
    TypeOrmModule.forFeature([
      IntegrationConnection,
      IntegrationOauthState,
      LlmIntegration,
      LlmUsage,
      EmailThread,
      EmailMessage,
      EmailParticipant,
      EmailLabel,
      EmailMessageLabel,
      EmailAttachment,
      EmailAnalysis,
      ThreadAnalysis,
      AttachmentAnalysis,
    ]),
  ],
  providers: [IntegrationsService, IntegrationsRouterBuilder],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, IntegrationsRouterBuilder],
})
export class IntegrationsModule {}
