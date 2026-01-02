import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { EmailAttachment } from '@server/datasources/email-attachment.entity';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { EmailThread } from '@server/datasources/email-thread.entity';
import { JobsService } from '@server/jobs/jobs.service';
import { type LlmAnalysisPayload } from '@server/jobs/queues';
import { Repository } from 'typeorm';
import { AttachmentAnalysis } from './attachment-analysis.entity';
import { EmailAnalysis } from './email-analysis.entity';
import { LlmIntegration, type LlmProvider } from './llm-integration.entity';
import { LlmUsage } from './llm-usage.entity';
import { OllamaService } from './ollama.service';
import { OpenAiService } from './openai.service';
import { PromptService } from './prompt.service';
import { ThreadAnalysis } from './thread-analysis.entity';

const MAX_LLM_INPUT_CHARS = 8000;
const SYSTEM_PROMPT =
  'You are an assistant that extracts structured insights from emails. ' +
  'Return ONLY valid JSON with keys: summary, tags, keywords, actions. ' +
  'summary: string or null. tags: array of strings. keywords: array of strings. ' +
  'actions: array of objects with fields { title, dueDate?, confidence?, category? }.';

type LlmActionItem = {
  title: string;
  dueDate?: string;
  confidence?: number;
  category?: string;
};

type LlmAnalysisResult = {
  summary: string | null;
  tags: string[];
  keywords: string[];
  actions: LlmActionItem[];
  raw: Record<string, unknown> | null;
};

type LlmUsageMetrics = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: string | null;
  metadata: Record<string, unknown> | null;
};

type LlmProviderResponse = {
  content: string;
  usage: LlmUsageMetrics;
};

@Injectable()
export class LlmService {
  private logger = new Logger(LlmService.name);

  constructor(
    @InjectRepository(DatasourceConnection)
    private readonly connectionRepository: Repository<DatasourceConnection>,
    @InjectRepository(EmailThread)
    private readonly threadRepository: Repository<EmailThread>,
    @InjectRepository(EmailMessage)
    private readonly messageRepository: Repository<EmailMessage>,
    @InjectRepository(EmailParticipant)
    private readonly participantRepository: Repository<EmailParticipant>,
    @InjectRepository(EmailAttachment)
    private readonly attachmentRepository: Repository<EmailAttachment>,
    @InjectRepository(EmailAnalysis)
    private readonly emailAnalysisRepository: Repository<EmailAnalysis>,
    @InjectRepository(ThreadAnalysis)
    private readonly threadAnalysisRepository: Repository<ThreadAnalysis>,
    @InjectRepository(AttachmentAnalysis)
    private readonly attachmentAnalysisRepository: Repository<AttachmentAnalysis>,
    @InjectRepository(LlmIntegration)
    private readonly llmIntegrationRepository: Repository<LlmIntegration>,
    @InjectRepository(LlmUsage)
    private readonly llmUsageRepository: Repository<LlmUsage>,
    private readonly promptService: PromptService,
    private readonly openAiService: OpenAiService,
    private readonly ollamaService: OllamaService,
    private readonly jobsService: JobsService,
  ) {}

  async listIntegrations(userId: string) {
    const integrations = await this.llmIntegrationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return integrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      model: integration.model,
      baseUrl: integration.baseUrl,
      isDefault: integration.isDefault,
      status: integration.status,
      createdAt: integration.createdAt,
    }));
  }

  async createIntegration(input: {
    userId: string;
    provider: LlmProvider;
    model: string;
    apiKey?: string | null;
    baseUrl?: string | null;
    isDefault?: boolean;
  }) {
    if (input.provider === 'openai' && !input.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const existingCount = await this.llmIntegrationRepository.count({
      where: { userId: input.userId },
    });

    const shouldSetDefault = Boolean(input.isDefault) || existingCount === 0;

    if (shouldSetDefault) {
      await this.llmIntegrationRepository.update(
        { userId: input.userId },
        { isDefault: false },
      );
    }

    const integration = this.llmIntegrationRepository.create({
      userId: input.userId,
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey ?? null,
      baseUrl: input.baseUrl ?? null,
      isDefault: shouldSetDefault,
      status: 'active',
    });

    const saved = await this.llmIntegrationRepository.save(integration);

    return {
      id: saved.id,
      provider: saved.provider,
      model: saved.model,
      baseUrl: saved.baseUrl,
      isDefault: saved.isDefault,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  async removeIntegration(userId: string, integrationId: string) {
    const integration = await this.llmIntegrationRepository.findOne({
      where: { id: integrationId, userId },
    });

    if (!integration) {
      return { removed: false };
    }

    await this.llmIntegrationRepository.delete({ id: integrationId });
    return { removed: true };
  }

  async processAnalysis(payload: LlmAnalysisPayload) {
    if (payload.type === 'email' && payload.messageId) {
      return this.analyzeEmail(payload.userId, payload.messageId);
    }

    if (payload.type === 'thread' && payload.threadId) {
      return this.analyzeThread(payload.userId, payload.threadId);
    }

    if (payload.type === 'attachment' && payload.attachmentId) {
      return this.analyzeAttachment(payload.userId, payload.attachmentId);
    }

    return { skipped: true };
  }

  private async analyzeEmail(userId: string, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message || message.llmProcessed) {
      return { skipped: true };
    }

    const connection = await this.connectionRepository.findOne({
      where: { id: message.connectionId, userId },
    });

    if (!connection) {
      return { skipped: true };
    }

    const fromParticipant = await this.participantRepository.findOne({
      where: { messageId, role: 'from' },
    });

    const integration = await this.getDefaultLlmIntegration(userId);
    if (!integration) {
      return { skipped: true, reason: 'no_llm_integration' };
    }

    const prompt = await this.promptService.buildEmailPrompt({
      userId,
      subject: message.subject,
      snippet: message.snippet,
      textBody: message.textBody,
      htmlBody: message.htmlBody,
      from: fromParticipant
        ? {
            name: fromParticipant.name,
            email: fromParticipant.email,
          }
        : null,
    });

    const analysis = await this.runLlmAnalysis({
      integration,
      userId,
      targetType: 'email',
      targetId: message.id,
      prompt,
    });

    if (!analysis) {
      return { skipped: true };
    }

    const existing = await this.emailAnalysisRepository.findOne({
      where: { messageId: message.id },
    });

    if (existing) {
      existing.summary = analysis.summary;
      existing.tags = analysis.tags;
      existing.keywords = analysis.keywords;
      existing.actions = analysis.actions;
      existing.rawResponse = analysis.raw;
      await this.emailAnalysisRepository.save(existing);
    } else {
      await this.emailAnalysisRepository.save(
        this.emailAnalysisRepository.create({
          messageId: message.id,
          summary: analysis.summary,
          tags: analysis.tags,
          keywords: analysis.keywords,
          actions: analysis.actions,
          rawResponse: analysis.raw,
        }),
      );
    }

    await this.messageRepository.update(
      { id: message.id },
      {
        llmProcessed: true,
        llmProcessedAt: new Date(),
      },
    );

    if (message.threadId) {
      await this.jobsService.enqueueLlmAnalysis({
        type: 'thread',
        userId,
        threadId: message.threadId,
      });
    }

    return { processed: true };
  }

  private async analyzeThread(userId: string, threadId: string) {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      return { skipped: true };
    }

    const connection = await this.connectionRepository.findOne({
      where: { id: thread.connectionId, userId },
    });

    if (!connection) {
      return { skipped: true };
    }

    const integration = await this.getDefaultLlmIntegration(userId);
    if (!integration) {
      return { skipped: true, reason: 'no_llm_integration' };
    }

    const messages = await this.messageRepository.find({
      where: { threadId: thread.id },
      order: { sentAt: 'DESC', createdAt: 'DESC' },
      take: 20,
      select: {
        subject: true,
        snippet: true,
        sentAt: true,
      },
    });

    const prompt = await this.promptService.buildThreadPrompt({
      subject: thread.subject,
      messages: messages.map((message) => ({
        subject: message.subject,
        snippet: message.snippet,
        sentAt: message.sentAt,
      })),
    });

    const analysis = await this.runLlmAnalysis({
      integration,
      userId,
      targetType: 'thread',
      targetId: thread.id,
      prompt,
    });

    if (!analysis) {
      return { skipped: true };
    }

    const existing = await this.threadAnalysisRepository.findOne({
      where: { threadId: thread.id },
    });

    if (existing) {
      existing.summary = analysis.summary;
      existing.tags = analysis.tags;
      existing.keywords = analysis.keywords;
      existing.actions = analysis.actions;
      existing.rawResponse = analysis.raw;
      await this.threadAnalysisRepository.save(existing);
    } else {
      await this.threadAnalysisRepository.save(
        this.threadAnalysisRepository.create({
          threadId: thread.id,
          summary: analysis.summary,
          tags: analysis.tags,
          keywords: analysis.keywords,
          actions: analysis.actions,
          rawResponse: analysis.raw,
        }),
      );
    }

    await this.threadRepository.update(
      { id: thread.id },
      {
        llmProcessed: true,
        llmProcessedAt: new Date(),
      },
    );

    return { processed: true };
  }

  private async analyzeAttachment(userId: string, attachmentId: string) {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.llmProcessed) {
      return { skipped: true };
    }

    const message = await this.messageRepository.findOne({
      where: { id: attachment.messageId },
      select: { id: true, connectionId: true },
    });

    if (!message) {
      return { skipped: true };
    }

    const connection = await this.connectionRepository.findOne({
      where: { id: message.connectionId, userId },
    });

    if (!connection) {
      return { skipped: true };
    }

    const integration = await this.getDefaultLlmIntegration(userId);
    if (!integration) {
      return { skipped: true, reason: 'no_llm_integration' };
    }

    const contentText = this.extractAttachmentText(attachment);

    const prompt = await this.promptService.buildAttachmentPrompt({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      contentText,
    });

    const analysis = await this.runLlmAnalysis({
      integration,
      userId,
      targetType: 'attachment',
      targetId: attachment.id,
      prompt,
    });

    if (!analysis) {
      return { skipped: true };
    }

    const existing = await this.attachmentAnalysisRepository.findOne({
      where: { attachmentId: attachment.id },
    });

    if (existing) {
      existing.summary = analysis.summary;
      existing.tags = analysis.tags;
      existing.keywords = analysis.keywords;
      existing.actions = analysis.actions;
      existing.rawResponse = analysis.raw;
      await this.attachmentAnalysisRepository.save(existing);
    } else {
      await this.attachmentAnalysisRepository.save(
        this.attachmentAnalysisRepository.create({
          attachmentId: attachment.id,
          summary: analysis.summary,
          tags: analysis.tags,
          keywords: analysis.keywords,
          actions: analysis.actions,
          rawResponse: analysis.raw,
        }),
      );
    }

    await this.attachmentRepository.update(
      { id: attachment.id },
      {
        llmProcessed: true,
        llmProcessedAt: new Date(),
      },
    );

    return { processed: true };
  }

  private async getDefaultLlmIntegration(userId: string) {
    const defaultIntegration = await this.llmIntegrationRepository.findOne({
      where: { userId, isDefault: true, status: 'active' },
      order: { createdAt: 'DESC' },
    });

    if (defaultIntegration) {
      return defaultIntegration;
    }

    return this.llmIntegrationRepository.findOne({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  private async runLlmAnalysis(input: {
    integration: LlmIntegration;
    userId: string;
    targetType: 'email' | 'thread' | 'attachment';
    targetId: string;
    prompt: string;
  }): Promise<LlmAnalysisResult | null> {
    try {
      const response = await this.callLlmProvider(
        input.integration,
        input.prompt,
      );

      await this.llmUsageRepository.save(
        this.llmUsageRepository.create({
          userId: input.userId,
          provider: input.integration.provider,
          model: input.integration.model,
          targetType: input.targetType,
          targetId: input.targetId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
          cost: response.usage.cost,
          status: 'success',
          error: null,
          metadata: response.usage.metadata,
        }),
      );

      return response.result;
    } catch (error) {
      await this.llmUsageRepository.save(
        this.llmUsageRepository.create({
          userId: input.userId,
          provider: input.integration.provider,
          model: input.integration.model,
          targetType: input.targetType,
          targetId: input.targetId,
          status: 'error',
          error: error instanceof Error ? error.message : 'unknown_error',
        }),
      );

      this.logger.error(error);
      return null;
    }
  }

  private async callLlmProvider(
    integration: LlmIntegration,
    prompt: string,
  ): Promise<{ result: LlmAnalysisResult; usage: LlmUsageMetrics }> {
    const trimmedPrompt = prompt.slice(0, MAX_LLM_INPUT_CHARS);

    let providerResponse: LlmProviderResponse;

    if (integration.provider === 'openai') {
      if (!integration.apiKey) {
        throw new Error('OpenAI API key missing');
      }

      providerResponse = await this.openAiService.request({
        apiKey: integration.apiKey,
        baseUrl: integration.baseUrl,
        model: integration.model,
        systemPrompt: SYSTEM_PROMPT,
        prompt: trimmedPrompt,
      });
    } else {
      providerResponse = await this.ollamaService.request({
        baseUrl: integration.baseUrl,
        model: integration.model,
        systemPrompt: SYSTEM_PROMPT,
        prompt: trimmedPrompt,
      });
    }

    return {
      result: this.parseLlmResponse(providerResponse.content),
      usage: providerResponse.usage,
    };
  }

  private parseLlmResponse(content: string): LlmAnalysisResult {
    let jsonText = content.trim();
    if (!jsonText.startsWith('{')) {
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start >= 0 && end >= 0) {
        jsonText = jsonText.slice(start, end + 1);
      }
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch (_error) {
      parsed = {};
    }

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag) => typeof tag === 'string')
        : [],
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((keyword) => typeof keyword === 'string')
        : [],
      actions: Array.isArray(parsed.actions)
        ? parsed.actions.filter((action) => typeof action === 'object')
        : [],
      raw: parsed,
    };
  }

  private extractAttachmentText(attachment: EmailAttachment) {
    if (!attachment.content) {
      return null;
    }

    const mimeType = attachment.mimeType ?? '';
    const isText =
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml';

    if (!isText) {
      return null;
    }

    const content = attachment.content.toString('utf-8');
    return content.slice(0, MAX_LLM_INPUT_CHARS);
  }
}
