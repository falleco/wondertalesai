import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { EmailAttachment } from '@server/datasources/email-attachment.entity';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { EmailThread } from '@server/datasources/email-thread.entity';
import { JobsModule } from '@server/jobs/jobs.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { WorkflowRule } from '@server/workflow/entities/workflow-rule.entity';
import { AttachmentAnalysis } from './entities/attachment-analysis.entity';
import { EmailAnalysis } from './entities/email-analysis.entity';
import { LlmIntegration } from './entities/llm-integration.entity';
import { LlmUsage } from './entities/llm-usage.entity';
import { ThreadAnalysis } from './entities/thread-analysis.entity';
import { LlmRouterBuilder } from './llm.router';
import { LlmService } from './services/llm.service';
import { OllamaService } from './services/ollama.service';
import { OpenAiService } from './services/openai.service';
import { PromptService } from './services/prompt.service';

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
