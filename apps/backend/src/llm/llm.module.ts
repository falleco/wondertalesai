import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { EmailAttachment } from '@server/datasources/email-attachment.entity';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { EmailThread } from '@server/datasources/email-thread.entity';
import { JobsModule } from '@server/jobs/jobs.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { WorkflowRule } from '@server/workflow/workflow-rule.entity';
import { AttachmentAnalysis } from './attachment-analysis.entity';
import { EmailAnalysis } from './email-analysis.entity';
import { LlmRouterBuilder } from './llm.router';
import { LlmService } from './llm.service';
import { LlmIntegration } from './llm-integration.entity';
import { LlmUsage } from './llm-usage.entity';
import { OllamaService } from './ollama.service';
import { OpenAiService } from './openai.service';
import { PromptService } from './prompt.service';
import { ThreadAnalysis } from './thread-analysis.entity';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    forwardRef(() => JobsModule),
    TypeOrmModule.forFeature([
      DatasourceConnection,
      EmailThread,
      EmailMessage,
      EmailParticipant,
      EmailAttachment,
      WorkflowRule,
      LlmIntegration,
      LlmUsage,
      EmailAnalysis,
      ThreadAnalysis,
      AttachmentAnalysis,
    ]),
  ],
  providers: [
    LlmService,
    PromptService,
    OpenAiService,
    OllamaService,
    LlmRouterBuilder,
  ],
  exports: [LlmService, LlmRouterBuilder],
})
export class LlmModule {}
