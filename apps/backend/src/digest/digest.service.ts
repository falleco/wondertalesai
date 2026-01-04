import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@server/auth/entities/User';
import { type AppConfigurationType } from '@server/config/configuration';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { EmailThread } from '@server/datasources/email-thread.entity';
import { JobsService } from '@server/jobs/jobs.service';
import { LlmService } from '@server/llm/services/llm.service';
import { UserPreferences } from '@server/noise/entities/user-preferences.entity';
import { In, Repository } from 'typeorm';
import { DigestItem } from './digest-item.entity';
import { DigestRun, type DigestRunType } from './digest-run.entity';

const DIGEST_CATEGORIES = [
  'work',
  'finance',
  'personal',
  'receipts',
  'newsletters',
  'promotions',
  'social',
  'other',
] as const;

type DigestCategory = (typeof DIGEST_CATEGORIES)[number];

type TriageResult = {
  category: DigestCategory;
  isCritical: boolean;
  actionRequired: boolean;
  actionItems: Array<{ task: string; dueDate?: string | null }>;
  summary: string;
  confidence: number;
  rationale: string;
};

type DigestMessageCandidate = {
  message: EmailMessage;
  from: EmailParticipant | null;
  thread: EmailThread | null;
  preview: string;
  triage: TriageResult;
  priorityScore: number;
};

const MAX_CANDIDATES = 200;
const MAX_ACTION_ITEMS = 10;
const MAX_CRITICAL_ITEMS = 5;
const MAX_THREAD_SUMMARIES = 5;

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ');

const buildPreviewText = (message: EmailMessage) => {
  const raw = message.snippet ?? message.textBody ?? message.htmlBody ?? '';
  const cleaned = stripHtml(raw).replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 800);
};

const isSensitiveMessage = (text: string) => {
  return /(verification code|one-time|otp|mfa|2fa|password|reset|security alert|sign-in code|login code)/i.test(
    text,
  );
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const parseLocalTime = (value: string) => {
  const [hourText, minuteText] = value.split(':');
  const hour = Number.parseInt(hourText ?? '', 10);
  const minute = Number.parseInt(minuteText ?? '', 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour: 8, minute: 30 };
  }
  return { hour, minute };
};

const getZonedParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: Number.parseInt(get('year'), 10),
    month: Number.parseInt(get('month'), 10),
    day: Number.parseInt(get('day'), 10),
    hour: Number.parseInt(get('hour'), 10),
    minute: Number.parseInt(get('minute'), 10),
    weekday: get('weekday'),
  };
};

const weekdayToNumber = (value: string) => {
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[value] ?? 1;
};

const formatDateInTimeZone = (date: Date, timeZone: string) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const getSafeTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch (_error) {
    return 'UTC';
  }
};

const getCategory = (value: string): DigestCategory => {
  if ((DIGEST_CATEGORIES as readonly string[]).includes(value)) {
    return value as DigestCategory;
  }
  return 'other';
};

@Injectable()
export class DigestService {
  private logger = new Logger(DigestService.name);

  constructor(
    @InjectRepository(DigestRun)
    private readonly digestRunRepository: Repository<DigestRun>,
    @InjectRepository(DigestItem)
    private readonly digestItemRepository: Repository<DigestItem>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(EmailMessage)
    private readonly messageRepository: Repository<EmailMessage>,
    @InjectRepository(EmailParticipant)
    private readonly participantRepository: Repository<EmailParticipant>,
    @InjectRepository(EmailThread)
    private readonly threadRepository: Repository<EmailThread>,
    @InjectRepository(DatasourceConnection)
    private readonly connectionRepository: Repository<DatasourceConnection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly llmService: LlmService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {}

  async listDigests(userId: string, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);

    const [items, total] = await this.digestRunRepository.findAndCount({
      where: { userId },
      order: { periodEnd: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });

    return {
      items: items.map((run) => ({
        id: run.id,
        type: run.type,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        status: run.status,
        subject: run.subject,
        generatedAt: run.generatedAt,
        sentAt: run.sentAt,
        stats: run.stats ?? {},
      })),
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }

  async getDigest(userId: string, digestId: string) {
    const digest = await this.digestRunRepository.findOne({
      where: { id: digestId, userId },
    });
    if (!digest) {
      return null;
    }

    const items = await this.digestItemRepository.find({
      where: { digestRunId: digestId },
      order: { priorityScore: 'DESC', createdAt: 'ASC' },
    });

    return {
      digest,
      items,
    };
  }

  async updateDigestPreferences(
    userId: string,
    input: Partial<UserPreferences>,
  ) {
    const preferences = await this.ensurePreferences(userId);

    if (typeof input.dailyDigestEnabled === 'boolean') {
      preferences.dailyDigestEnabled = input.dailyDigestEnabled;
    }
    if (typeof input.dailyDigestTimeLocal === 'string') {
      preferences.dailyDigestTimeLocal = input.dailyDigestTimeLocal;
    }
    if (typeof input.weeklyDigestEnabled === 'boolean') {
      preferences.weeklyDigestEnabled = input.weeklyDigestEnabled;
    }
    if (typeof input.weeklyDigestDayOfWeek === 'number') {
      preferences.weeklyDigestDayOfWeek = input.weeklyDigestDayOfWeek;
    }
    if (typeof input.digestTimezone === 'string') {
      preferences.digestTimezone = input.digestTimezone;
    }
    if (typeof input.digestMaxItems === 'number') {
      preferences.digestMaxItems = input.digestMaxItems;
    }

    return await this.preferencesRepository.save(preferences);
  }

  async getDigestPreferences(userId: string) {
    const preferences = await this.ensurePreferences(userId);
    return {
      dailyDigestEnabled: preferences.dailyDigestEnabled,
      dailyDigestTimeLocal: preferences.dailyDigestTimeLocal,
      weeklyDigestEnabled: preferences.weeklyDigestEnabled,
      weeklyDigestDayOfWeek: preferences.weeklyDigestDayOfWeek,
      digestTimezone: preferences.digestTimezone,
      digestMaxItems: preferences.digestMaxItems,
    };
  }

  async runScheduledDigests() {
    const userIds = await this.connectionRepository
      .createQueryBuilder('connection')
      .select('DISTINCT "connection"."user_id"', 'userId')
      .getRawMany<{ userId: string }>();

    for (const entry of userIds) {
      await this.runScheduledDigestForUser(entry.userId);
    }

    return { scheduled: true };
  }

  async runManualDigest(userId: string, type: DigestRunType) {
    const now = new Date();
    const periodStart =
      type === 'daily'
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.runDigestForUser(userId, type, periodStart, now);
  }

  private async runScheduledDigestForUser(userId: string) {
    const preferences = await this.ensurePreferences(userId);
    const timezone = getSafeTimeZone(preferences.digestTimezone || 'UTC');
    const now = new Date();
    const zonedParts = getZonedParts(now, timezone);
    const { hour, minute } = parseLocalTime(preferences.dailyDigestTimeLocal);
    const isAfterTime =
      zonedParts.hour > hour ||
      (zonedParts.hour === hour && zonedParts.minute >= minute);
    const localDate = `${zonedParts.year}-${String(zonedParts.month).padStart(
      2,
      '0',
    )}-${String(zonedParts.day).padStart(2, '0')}`;

    const lastDaily = await this.digestRunRepository.findOne({
      where: { userId, type: 'daily' },
      order: { periodEnd: 'DESC' },
    });
    const lastDailyDate = lastDaily
      ? formatDateInTimeZone(lastDaily.periodEnd, timezone)
      : null;

    if (
      preferences.dailyDigestEnabled &&
      isAfterTime &&
      lastDailyDate !== localDate
    ) {
      await this.runDigestForUser(
        userId,
        'daily',
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
        now,
      );
    }

    const weeklyDay = preferences.weeklyDigestDayOfWeek;
    const localWeekday = weekdayToNumber(zonedParts.weekday);
    const lastWeekly = await this.digestRunRepository.findOne({
      where: { userId, type: 'weekly' },
      order: { periodEnd: 'DESC' },
    });
    const lastWeeklyDate = lastWeekly
      ? formatDateInTimeZone(lastWeekly.periodEnd, timezone)
      : null;

    if (
      preferences.weeklyDigestEnabled &&
      localWeekday === weeklyDay &&
      isAfterTime &&
      lastWeeklyDate !== localDate
    ) {
      await this.runDigestForUser(
        userId,
        'weekly',
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        now,
      );
    }
  }

  private async runDigestForUser(
    userId: string,
    type: DigestRunType,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      return { skipped: true };
    }

    const digestRun = await this.digestRunRepository.save(
      this.digestRunRepository.create({
        userId,
        type,
        periodStart,
        periodEnd,
        status: 'pending',
      }),
    );

    try {
      const preferences = await this.ensurePreferences(userId);
      const candidates = await this.collectCandidates(
        userId,
        periodStart,
        periodEnd,
      );
      const triaged = await this.triageCandidates(userId, candidates);
      const { items, contentText, contentHtml, stats } =
        await this.composeDigest(
          type,
          userId,
          triaged,
          preferences,
          periodStart,
          periodEnd,
          digestRun.id,
        );

      if (items.length > 0) {
        await this.digestItemRepository.save(items);
      }

      const subject = this.buildDigestSubject(
        type,
        periodStart,
        periodEnd,
        preferences.digestTimezone,
      );

      digestRun.status = 'generated';
      digestRun.subject = subject;
      digestRun.contentText = contentText;
      digestRun.contentHtml = contentHtml;
      digestRun.stats = stats;
      digestRun.generatedAt = new Date();
      await this.digestRunRepository.save(digestRun);

      const templateId =
        type === 'daily'
          ? this.configService.get<AppConfigurationType['email']>('email')
              ?.templates?.dailyDigest
          : this.configService.get<AppConfigurationType['email']>('email')
              ?.templates?.weeklyDigest;

      if (!templateId) {
        digestRun.status = 'error';
        digestRun.errorMessage = 'Digest template not configured';
        await this.digestRunRepository.save(digestRun);
        return { error: true };
      }

      await this.jobsService.enqueueEmail({
        templateId,
        to: user.email,
        payload: {
          subject,
          contentText,
          contentHtml,
          digestId: digestRun.id,
          type,
        },
      });

      digestRun.status = 'sent';
      digestRun.sentAt = new Date();
      await this.digestRunRepository.save(digestRun);

      return { sent: true, digestId: digestRun.id };
    } catch (error) {
      digestRun.status = 'error';
      digestRun.errorMessage =
        error instanceof Error ? error.message : 'unknown_error';
      await this.digestRunRepository.save(digestRun);
      this.logger.error(error);
      return { error: true };
    }
  }

  private async collectCandidates(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .addSelect(
        'COALESCE(message.sentAt, message.createdAt)',
        'message_timestamp',
      )
      .innerJoin(
        DatasourceConnection,
        'connection',
        'connection.id = message.connectionId',
      )
      .where('connection.userId = :userId', { userId })
      .andWhere('COALESCE(message.sentAt, message.createdAt) >= :periodStart', {
        periodStart,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) < :periodEnd', {
        periodEnd,
      })
      .andWhere('message.isBlocked = false')
      .andWhere('message.isNoise = false')
      .orderBy('message_timestamp', 'DESC')
      .take(MAX_CANDIDATES)
      .getMany();

    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map((message) => message.id);
    const participants = await this.participantRepository.find({
      where: { messageId: In(messageIds), role: 'from' },
    });
    const participantByMessage = new Map(
      participants.map((participant) => [participant.messageId, participant]),
    );

    const threadIds = messages
      .map((message) => message.threadId)
      .filter((id): id is string => Boolean(id));
    const threads = threadIds.length
      ? await this.threadRepository.find({ where: { id: In(threadIds) } })
      : [];
    const threadById = new Map(threads.map((thread) => [thread.id, thread]));

    return messages.map((message) => ({
      message,
      from: participantByMessage.get(message.id) ?? null,
      thread: message.threadId
        ? (threadById.get(message.threadId) ?? null)
        : null,
      preview: buildPreviewText(message),
    }));
  }

  private async triageCandidates(
    userId: string,
    candidates: Array<{
      message: EmailMessage;
      from: EmailParticipant | null;
      thread: EmailThread | null;
      preview: string;
    }>,
  ): Promise<DigestMessageCandidate[]> {
    const result: DigestMessageCandidate[] = [];

    for (const candidate of candidates) {
      const message = candidate.message;
      const messageTimestamp = message.sentAt ?? message.createdAt;
      const existingTriage =
        message.triageEvaluatedAt &&
        message.triageSummary &&
        message.triageCategory
          ? {
              category: getCategory(message.triageCategory),
              isCritical: message.triageIsCritical,
              actionRequired: message.triageActionRequired,
              actionItems: message.triageActionItems ?? [],
              summary: message.triageSummary,
              confidence: message.triageConfidence,
              rationale: '',
            }
          : null;

      let triage = existingTriage;
      if (!triage) {
        const contextMessages = await this.getThreadContextMessages(message);
        const sensitive = isSensitiveMessage(
          `${message.subject ?? ''} ${candidate.preview}`,
        );
        const llmResult = await this.llmService.triageDigestMessage({
          userId,
          fromName: candidate.from?.name ?? null,
          fromEmail: candidate.from?.email ?? null,
          subject: message.subject ?? null,
          sentAt: messageTimestamp?.toISOString() ?? null,
          snippet: candidate.preview,
          threadSubject: candidate.thread?.subject ?? null,
          previousMessages: contextMessages,
        });

        const fallbackSummary = sensitive
          ? 'Security email received.'
          : candidate.preview || 'Email received.';

        triage = {
          category: getCategory(llmResult?.category ?? 'other'),
          isCritical: llmResult?.isCritical ?? false,
          actionRequired: llmResult?.actionRequired ?? false,
          actionItems: llmResult?.actionItems ?? [],
          summary: llmResult?.summary ?? fallbackSummary,
          confidence: llmResult?.confidence ?? 0,
          rationale: llmResult?.rationale ?? '',
        };

        if (sensitive) {
          triage.summary = 'Security email received.';
        }

        message.triageCategory = triage.category;
        message.triageIsCritical = triage.isCritical;
        message.triageActionRequired = triage.actionRequired;
        message.triageSummary = triage.summary;
        message.triageActionItems = triage.actionItems;
        message.triageConfidence = triage.confidence;
        message.triageEvaluatedAt = new Date();
        await this.messageRepository.save(message);
      }

      const priorityScore = this.calculatePriorityScore(
        triage,
        messageTimestamp,
        message.subject ?? '',
        candidate.preview,
      );

      result.push({
        message,
        from: candidate.from,
        thread: candidate.thread,
        preview: candidate.preview,
        triage,
        priorityScore,
      });
    }

    return result;
  }

  private calculatePriorityScore(
    triage: TriageResult,
    sentAt: Date | null,
    subject: string,
    preview: string,
  ) {
    let score = 0;
    if (triage.isCritical) {
      score += 0.5;
    }
    if (triage.actionRequired) {
      score += 0.3;
    }
    if (sentAt) {
      const hoursSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
      const recencyScore = clamp01(1 - Math.min(hoursSince / 24, 1));
      score += 0.2 * recencyScore;
    }

    const combined = `${subject} ${preview}`.toLowerCase();
    if (
      (triage.category === 'finance' || triage.category === 'receipts') &&
      /(\$|usd|eur|gbp|invoice|payment|charged|receipt)/.test(combined)
    ) {
      score += 0.1;
    }

    return clamp01(score);
  }

  private async composeDigest(
    type: DigestRunType,
    userId: string,
    triaged: DigestMessageCandidate[],
    preferences: UserPreferences,
    periodStart: Date,
    periodEnd: Date,
    digestRunId: string,
  ) {
    const maxItems = preferences.digestMaxItems ?? 30;
    const messageItems = triaged
      .map((candidate) => ({
        candidate,
        messageId: candidate.message.id,
        threadId: candidate.message.threadId,
        title: candidate.message.subject ?? 'No subject',
        summary: candidate.triage.summary.slice(0, 240),
        category: candidate.triage.category,
        isCritical: candidate.triage.isCritical,
        actionRequired:
          candidate.triage.actionRequired ||
          candidate.triage.actionItems.length > 0,
        actionItems: candidate.triage.actionItems,
        priorityScore: candidate.priorityScore,
        senderLabel:
          candidate.from?.name || candidate.from?.email || 'Unknown sender',
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const critical = messageItems
      .filter((item) => item.isCritical)
      .slice(0, MAX_CRITICAL_ITEMS);

    const actionItems = messageItems
      .filter((item) => item.actionItems.length > 0)
      .flatMap((item) =>
        item.actionItems.map((action) => ({
          item,
          task: action.task,
          dueDate: action.dueDate ?? null,
        })),
      )
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate) {
          return -1;
        }
        if (b.dueDate) {
          return 1;
        }
        return b.item.priorityScore - a.item.priorityScore;
      })
      .slice(0, MAX_ACTION_ITEMS);

    const usedMessageIds = new Set<string>(
      [...critical, ...actionItems.map((action) => action.item)].map(
        (entry) => entry.messageId,
      ),
    );

    const categoryBuckets = new Map<DigestCategory, typeof messageItems>();
    for (const entry of messageItems) {
      if (usedMessageIds.has(entry.messageId)) {
        continue;
      }
      const bucket = categoryBuckets.get(entry.category) ?? [];
      bucket.push(entry);
      categoryBuckets.set(entry.category, bucket);
    }

    const categoryItems: typeof messageItems = [];
    for (const category of DIGEST_CATEGORIES) {
      const entries = categoryBuckets.get(category) ?? [];
      for (const entry of entries) {
        if (categoryItems.length + critical.length >= maxItems) {
          break;
        }
        categoryItems.push(entry);
      }
    }

    const threadSummaries = await this.buildThreadSummaries(triaged, userId);

    const items: DigestItem[] = [];
    const addMessageItems = (entries: typeof messageItems) => {
      for (const entry of entries) {
        items.push(
          this.digestItemRepository.create({
            digestRunId,
            kind: 'message',
            messageId: entry.messageId,
            threadId: entry.threadId ?? null,
            title: `${entry.senderLabel} — ${entry.title}`,
            summary: entry.summary,
            category: entry.category,
            isCritical: entry.isCritical,
            actionRequired: entry.actionRequired,
            priorityScore: entry.priorityScore,
            metadata: {
              senderEmail: entry.candidate.from?.email ?? null,
              rationale: entry.candidate.triage.rationale,
            },
          }),
        );
      }
    };

    addMessageItems(critical);
    addMessageItems(categoryItems);

    for (const action of actionItems) {
      items.push(
        this.digestItemRepository.create({
          digestRunId,
          kind: 'action_item',
          messageId: action.item.messageId,
          threadId: action.item.threadId ?? null,
          title: action.task.slice(0, 120),
          summary: action.item.summary,
          category: action.item.category,
          isCritical: action.item.isCritical,
          actionRequired: true,
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
          priorityScore: action.item.priorityScore,
          metadata: {
            senderEmail: action.item.candidate.from?.email ?? null,
            messageTitle: action.item.title,
          },
        }),
      );
    }

    for (const summary of threadSummaries) {
      items.push(
        this.digestItemRepository.create({
          digestRunId,
          kind: 'thread',
          messageId: summary.messageId,
          threadId: summary.threadId,
          title: summary.title,
          summary: summary.summary,
          category: summary.category,
          isCritical: summary.isCritical,
          actionRequired: summary.actionRequired,
          priorityScore: summary.priorityScore,
          metadata: summary.metadata,
        }),
      );
    }

    const contentText = this.buildDigestContent({
      type,
      periodStart,
      periodEnd,
      critical,
      actionItems,
      categoryItems,
      threadSummaries,
      userId,
      timezone: preferences.digestTimezone,
      digestId: digestRunId,
    });

    const contentHtml = contentText.replace(/\n/g, '<br />');

    return {
      items,
      contentText,
      contentHtml,
      stats: {
        totalCandidates: triaged.length,
        criticalCount: critical.length,
        actionCount: actionItems.length,
        categoryCount: categoryItems.length,
        threadSummaryCount: threadSummaries.length,
      },
    };
  }

  private buildDigestContent(input: {
    type: DigestRunType;
    periodStart: Date;
    periodEnd: Date;
    critical: Array<{
      title: string;
      summary: string;
      senderLabel: string;
      messageId: string;
      threadId: string | null;
    }>;
    actionItems: Array<{
      item: {
        messageId: string;
        senderLabel: string;
        title: string;
        summary: string;
      };
      task: string;
      dueDate: string | null;
    }>;
    categoryItems: Array<{
      title: string;
      summary: string;
      senderLabel: string;
      category: DigestCategory;
      messageId: string;
      threadId: string | null;
    }>;
    threadSummaries: Array<{
      title: string;
      summary: string;
      threadId: string;
      messageId: string | null;
    }>;
    userId: string;
    timezone: string;
    digestId: string;
  }) {
    const baseUrl = this.getAppBaseUrl();
    const timezone = getSafeTimeZone(input.timezone);
    const digestLink = `${baseUrl}/digests/${input.digestId}`;
    const lines: string[] = [];

    lines.push(
      input.type === 'daily'
        ? 'Mailestro Daily Digest'
        : 'Mailestro Weekly Digest',
    );
    lines.push(
      `Period: ${formatDateInTimeZone(
        input.periodStart,
        timezone,
      )} - ${formatDateInTimeZone(input.periodEnd, timezone)}`,
    );
    lines.push('');

    lines.push('Top 5 Critical');
    if (input.critical.length === 0) {
      lines.push('- No critical items today.');
    } else {
      for (const item of input.critical) {
        const link = `${baseUrl}/emails?message=${item.messageId}`;
        lines.push(`- ${item.senderLabel} — ${item.title}`);
        lines.push(`  ${item.summary}`);
        lines.push(`  View: ${link}`);
      }
    }
    lines.push('');

    lines.push('Action Required');
    if (input.actionItems.length === 0) {
      lines.push('- No action items detected.');
    } else {
      for (const action of input.actionItems) {
        const link = `${baseUrl}/emails?message=${action.item.messageId}`;
        const due = action.dueDate ? ` (due ${action.dueDate})` : '';
        lines.push(
          `- ${action.task}${due} — ${action.item.senderLabel}: ${action.item.title}`,
        );
        lines.push(`  ${action.item.summary}`);
        lines.push(`  View: ${link}`);
      }
    }
    lines.push('');

    lines.push('By Category');
    const byCategory = new Map<DigestCategory, typeof input.categoryItems>();
    for (const item of input.categoryItems) {
      const bucket = byCategory.get(item.category) ?? [];
      bucket.push(item);
      byCategory.set(item.category, bucket);
    }
    for (const category of DIGEST_CATEGORIES) {
      const entries = byCategory.get(category);
      if (!entries || entries.length === 0) {
        continue;
      }
      lines.push(category.toUpperCase());
      for (const entry of entries) {
        const link = `${baseUrl}/emails?message=${entry.messageId}`;
        lines.push(`- ${entry.senderLabel} — ${entry.title}`);
        lines.push(`  ${entry.summary}`);
        lines.push(`  View: ${link}`);
      }
      lines.push('');
    }

    if (input.threadSummaries.length > 0) {
      lines.push('Thread Summaries');
      for (const summary of input.threadSummaries) {
        const link = summary.messageId
          ? `${baseUrl}/emails?message=${summary.messageId}`
          : `${baseUrl}/emails`;
        lines.push(`- ${summary.title}`);
        lines.push(`  ${summary.summary}`);
        lines.push(`  View: ${link}`);
      }
      lines.push('');
    }

    lines.push(`View digest: ${digestLink}`);

    return lines.join('\n');
  }

  private buildDigestSubject(
    type: DigestRunType,
    periodStart: Date,
    periodEnd: Date,
    timezone: string,
  ) {
    const safeTimezone = getSafeTimeZone(timezone);
    if (type === 'daily') {
      return `Mailestro Daily Digest — ${formatDateInTimeZone(
        periodEnd,
        safeTimezone,
      )}`;
    }
    return `Mailestro Weekly Digest — Week of ${formatDateInTimeZone(
      periodStart,
      safeTimezone,
    )}`;
  }

  private async buildThreadSummaries(
    triaged: DigestMessageCandidate[],
    userId: string,
  ) {
    const threadMap = new Map<
      string,
      {
        threadId: string;
        threadSubject: string;
        messages: DigestMessageCandidate[];
        criticalCount: number;
      }
    >();

    for (const candidate of triaged) {
      if (!candidate.message.threadId) {
        continue;
      }
      const threadId = candidate.message.threadId;
      const existing = threadMap.get(threadId);
      const entry = existing ?? {
        threadId,
        threadSubject: candidate.thread?.subject ?? 'Thread',
        messages: [] as DigestMessageCandidate[],
        criticalCount: 0,
      };

      entry.messages.push(candidate);
      if (candidate.triage.isCritical) {
        entry.criticalCount += 1;
      }
      threadMap.set(threadId, entry);
    }

    const threads = Array.from(threadMap.values())
      .sort((a, b) => {
        if (a.criticalCount !== b.criticalCount) {
          return b.criticalCount - a.criticalCount;
        }
        return b.messages.length - a.messages.length;
      })
      .slice(0, MAX_THREAD_SUMMARIES);

    const summaries: Array<{
      threadId: string;
      messageId: string | null;
      title: string;
      summary: string;
      category: DigestCategory;
      isCritical: boolean;
      actionRequired: boolean;
      priorityScore: number;
      metadata: Record<string, unknown> | null;
    }> = [];

    for (const thread of threads) {
      const messages = await this.messageRepository.find({
        where: { threadId: thread.threadId },
        order: { sentAt: 'DESC' },
        take: 6,
      });

      const participants = await this.participantRepository.find({
        where: {
          messageId: In(messages.map((message) => message.id)),
          role: 'from',
        },
      });
      const participantByMessage = new Map(
        participants.map((participant) => [participant.messageId, participant]),
      );

      const timeline = messages.map((message) => ({
        from:
          participantByMessage.get(message.id)?.email ??
          participantByMessage.get(message.id)?.name ??
          'Unknown',
        sentAt: message.sentAt?.toISOString() ?? null,
        snippet: buildPreviewText(message),
      }));

      const summary = await this.llmService.summarizeDigestThread({
        userId,
        threadSubject: thread.threadSubject,
        participants: Array.from(
          new Set(
            participants
              .map((participant) => participant.email ?? participant.name)
              .filter(Boolean),
          ),
        ),
        timeline,
        messageSummaries: thread.messages.map((entry) => entry.triage.summary),
      });

      const fallbackSummary =
        summary?.threadSummary ?? 'Thread summary unavailable.';

      summaries.push({
        threadId: thread.threadId,
        messageId: messages[0]?.id ?? null,
        title: thread.threadSubject,
        summary: fallbackSummary.slice(0, 300),
        category: thread.messages[0]?.triage.category ?? 'other',
        isCritical: thread.criticalCount > 0,
        actionRequired: thread.messages.some(
          (message) => message.triage.actionRequired,
        ),
        priorityScore: clamp01(
          thread.messages.reduce((acc, item) => acc + item.priorityScore, 0) /
            Math.max(thread.messages.length, 1),
        ),
        metadata: summary
          ? {
              keyDecisions: summary.keyDecisions,
              openQuestions: summary.openQuestions,
              actionItems: summary.actionItems,
              confidence: summary.confidence,
            }
          : null,
      });
    }

    return summaries;
  }

  private async getThreadContextMessages(message: EmailMessage) {
    const messageTimestamp = message.sentAt ?? message.createdAt;
    if (!message.threadId || !messageTimestamp) {
      return [];
    }
    const previous = await this.messageRepository
      .createQueryBuilder('message')
      .addSelect(
        'COALESCE(message.sentAt, message.createdAt)',
        'message_timestamp',
      )
      .where('"message"."thread_id" = :threadId', {
        threadId: message.threadId,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) < :sentAt', {
        sentAt: messageTimestamp,
      })
      .orderBy('message_timestamp', 'DESC')
      .take(2)
      .getMany();

    const items = previous.map((entry) => ({
      subject: entry.subject ?? '',
      snippet: buildPreviewText(entry),
      sentAt: entry.sentAt?.toISOString() ?? null,
    }));

    return items.slice(0, 2);
  }

  private getAppBaseUrl() {
    const appConfig = this.configService.get<
      AppConfigurationType['app'] | undefined
    >('app');
    if (appConfig?.baseUrl) {
      return appConfig.baseUrl.replace(/\/$/, '');
    }
    const corsValue =
      this.configService.get<AppConfigurationType['cors']>('cors') ?? '';
    const base = corsValue.split(',').map((entry: string) => entry.trim())[0];
    if (base?.startsWith('http')) {
      return base.replace(/\/$/, '');
    }
    return 'http://localhost:3000';
  }

  private async ensurePreferences(userId: string) {
    const existing = await this.preferencesRepository.findOne({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return await this.preferencesRepository.save(
      this.preferencesRepository.create({ userId }),
    );
  }
}
