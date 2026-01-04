import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkflowRule } from '@server/workflow/entities/workflow-rule.entity';
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
      'Tags must be lowercase slug strings using "-" instead of spaces.',
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
      'Tags must be lowercase slug strings using "-" instead of spaces.',
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
      'Tags must be lowercase slug strings using "-" instead of spaces.',
      `Filename: ${input.filename ?? 'N/A'}`,
      `Mime type: ${input.mimeType ?? 'N/A'}`,
      `Size: ${input.size ?? 0}`,
      input.contentText ? `Content: ${input.contentText}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  buildMarketingClassifierPrompt(input: {
    fromName: string | null;
    fromEmail: string | null;
    subject: string | null;
    snippet: string | null;
    listUnsubscribe: string | null;
    recentSubjects: string[];
  }) {
    const recentSubjects = input.recentSubjects.length
      ? input.recentSubjects.map((subject) => `- ${subject}`).join('\n')
      : 'N/A';

    return [
      'Classify the sender and message based on marketing intent.',
      'Return ONLY JSON with the required fields.',
      `From name: ${input.fromName ?? 'N/A'}`,
      `From email: ${input.fromEmail ?? 'N/A'}`,
      `Subject: ${input.subject ?? 'N/A'}`,
      `Preview: ${input.snippet ?? 'N/A'}`,
      `List-Unsubscribe header: ${input.listUnsubscribe ?? 'N/A'}`,
      'Recent subjects:',
      recentSubjects,
    ]
      .filter(Boolean)
      .join('\n');
  }

  buildDigestTriagePrompt(input: {
    fromName: string | null;
    fromEmail: string | null;
    subject: string | null;
    sentAt: string | null;
    snippet: string | null;
    threadSubject?: string | null;
    previousMessages?: Array<{
      subject: string;
      snippet: string;
      sentAt: string | null;
    }>;
  }) {
    const previousMessages = input.previousMessages?.length
      ? input.previousMessages
          .map(
            (message, index) =>
              `#${index + 1} ${message.sentAt ?? 'N/A'} | ${message.subject} | ${message.snippet}`,
          )
          .join('\n')
      : 'N/A';

    return [
      'Triage the message into category, criticality, and action required.',
      'Return ONLY JSON with the required fields.',
      `From name: ${input.fromName ?? 'N/A'}`,
      `From email: ${input.fromEmail ?? 'N/A'}`,
      `Subject: ${input.subject ?? 'N/A'}`,
      `Sent at: ${input.sentAt ?? 'N/A'}`,
      `Thread subject: ${input.threadSubject ?? 'N/A'}`,
      `Preview: ${input.snippet ?? 'N/A'}`,
      'Previous messages:',
      previousMessages,
    ]
      .filter(Boolean)
      .join('\n');
  }

  buildDigestThreadPrompt(input: {
    threadSubject: string | null;
    participants: string[];
    timeline: Array<{ from: string; sentAt: string | null; snippet: string }>;
    messageSummaries?: string[];
  }) {
    const timeline = input.timeline
      .map(
        (message, index) =>
          `#${index + 1} ${message.sentAt ?? 'N/A'} | ${message.from} | ${message.snippet}`,
      )
      .join('\n');
    const summaries = input.messageSummaries?.length
      ? input.messageSummaries.map((summary) => `- ${summary}`).join('\n')
      : 'N/A';

    return [
      'Summarize the thread into a concise digest summary.',
      'Return ONLY JSON with the required fields.',
      `Thread subject: ${input.threadSubject ?? 'N/A'}`,
      `Participants: ${input.participants.join(', ') || 'N/A'}`,
      'Timeline:',
      timeline,
      'Message summaries:',
      summaries,
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
      'When including rule tags, convert them to lowercase slug format with "-" instead of spaces.',
      ...lines,
    ].join('\n');
  }
}
