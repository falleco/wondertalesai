import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkflowRule } from '@server/workflow/workflow-rule.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PromptService {
  constructor(
    @InjectRepository(WorkflowRule)
    private readonly ruleRepository: Repository<WorkflowRule>,
  ) {}

  async buildEmailPrompt(input: {
    userId: string;
    subject: string | null;
    snippet: string | null;
    textBody: string | null;
    htmlBody: string | null;
    from: { name: string | null; email: string } | null;
  }) {
    const body = input.textBody ?? input.htmlBody ?? input.snippet ?? '';
    const rules = await this.ruleRepository.find({
      where: { userId: input.userId },
      order: { createdAt: 'ASC' },
    });

    const ruleBlock = this.formatRules(rules);

    return [
      'Analyze the email and extract summary, tags, keywords, and actions.',
      ruleBlock,
      `Subject: ${input.subject ?? 'N/A'}`,
      `From: ${input.from?.name ?? ''} ${input.from?.email ?? ''}`.trim(),
      `Body: ${body}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  buildThreadPrompt(input: {
    subject: string | null;
    messages: Array<{
      subject: string | null;
      snippet: string | null;
      sentAt: Date | null;
    }>;
  }) {
    const lines = input.messages.map((message, index) => {
      const sentAt = message.sentAt ? message.sentAt.toISOString() : 'N/A';
      return `#${index + 1} | ${sentAt} | ${message.subject ?? ''} | ${message.snippet ?? ''}`;
    });

    return [
      'Analyze the email thread and extract summary, tags, keywords, and actions.',
      `Thread subject: ${input.subject ?? 'N/A'}`,
      'Messages:',
      ...lines,
    ]
      .filter(Boolean)
      .join('\n');
  }

  buildAttachmentPrompt(input: {
    filename: string | null;
    mimeType: string | null;
    size: number | null;
    contentText: string | null;
  }) {
    return [
      'Analyze the attachment and extract summary, tags, keywords, and actions.',
      `Filename: ${input.filename ?? 'N/A'}`,
      `Mime type: ${input.mimeType ?? 'N/A'}`,
      `Size: ${input.size ?? 0}`,
      input.contentText ? `Content: ${input.contentText}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private formatRules(rules: WorkflowRule[]) {
    if (rules.length === 0) {
      return null;
    }

    const lines = rules.flatMap((rule, index) => {
      const outputTags = (rule.outputTags ?? []).join(', ');
      return [
        `Rule #${index + 1}: ${rule.name}`,
        `Guidelines: ${rule.guidelines}`,
        `Output tags: ${outputTags || 'N/A'}`,
      ];
    });

    return [
      'User workflow rules:',
      'If a rule matches the email, include ALL its output tags in the tags array.',
      ...lines,
    ].join('\n');
  }
}
