import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@server/auth/entities/User';
import { type AppConfigurationType } from '@server/config/configuration';
import { DatasourceConnection } from '@server/datasources/datasource-connection.entity';
import { extractUnsubscribeLinks } from '@server/datasources/datasources.utils';
import { EmailMessage } from '@server/datasources/email-message.entity';
import { EmailParticipant } from '@server/datasources/email-participant.entity';
import { Queues, type SendEmailPayload } from '@server/jobs/queues';
import { LlmService } from '@server/llm/services/llm.service';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import {
  BlockRule,
  type BlockRuleAction,
  type BlockRuleMatchType,
} from '../entities/block-rule.entity';
import { NoiseEvaluationRun } from '../entities/noise-evaluation-run.entity';
import {
  SenderProfile,
  type SenderProfileStatus,
} from '../entities/sender-profile.entity';
import {
  type UnsubscribeActionType,
  UnsubscribeEvent,
} from '../entities/unsubscribe-event.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { WeeklyDigestLog } from '../entities/weekly-digest-log.entity';

type SenderAggregate = {
  senderKey: string;
  senderEmail: string | null;
  senderName: string | null;
  senderDomain: string | null;
  messageCount30d: number;
  messageCount7d: number;
  readCount30d: number;
  hasListUnsubscribe: boolean;
  unsubscribeLinks: Set<string>;
  exampleSubjects: string[];
  recentSubjects: string[];
  latestMessage: {
    subject: string | null;
    snippet: string | null;
    textBody: string | null;
    htmlBody: string | null;
    listUnsubscribe: string | null;
  } | null;
};

type BlockRuleMatchInput = {
  userId: string;
  senderEmail: string | null;
  senderDomain: string | null;
  senderName: string | null;
  subject: string | null;
};

type UnsubscribePlanItem = {
  senderProfileId: string;
  senderEmail: string | null;
  senderName: string | null;
  messageCount30d: number;
  lowValueScore: number;
  suggestedAction: 'send_mailto' | 'open_link' | 'block';
  mailtoDraft?: {
    to: string;
    subject: string;
    body: string;
  };
  links?: string[];
};

const normalizeSenderKey = (
  senderEmail?: string | null,
  senderName?: string | null,
) => {
  if (senderEmail) {
    return senderEmail.trim().toLowerCase();
  }
  return senderName?.trim().toLowerCase() ?? '';
};

const getSenderDomain = (email?: string | null) => {
  if (!email) {
    return null;
  }
  const parts = email.split('@');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getSuggestedAction = (
  links: string[],
): 'send_mailto' | 'open_link' | 'block' => {
  const hasMailto = links.some((link) => link.startsWith('mailto:'));
  if (hasMailto) {
    return 'send_mailto';
  }
  const hasHttp = links.some(
    (link) => link.startsWith('http://') || link.startsWith('https://'),
  );
  if (hasHttp) {
    return 'open_link';
  }
  return 'block';
};

const parseMailto = (link: string) => {
  try {
    const url = new URL(link);
    const to = url.pathname;
    const subject = url.searchParams.get('subject') ?? 'Unsubscribe';
    const body = url.searchParams.get('body') ?? '';
    return { to, subject, body };
  } catch {
    return null;
  }
};

@Injectable()
export class NoiseService {
  private logger = new Logger(NoiseService.name);

  constructor(
    @InjectRepository(SenderProfile)
    private readonly senderProfileRepository: Repository<SenderProfile>,
    @InjectRepository(UnsubscribeEvent)
    private readonly unsubscribeEventRepository: Repository<UnsubscribeEvent>,
    @InjectRepository(BlockRule)
    private readonly blockRuleRepository: Repository<BlockRule>,
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
    @InjectRepository(NoiseEvaluationRun)
    private readonly noiseEvaluationRepository: Repository<NoiseEvaluationRun>,
    @InjectRepository(WeeklyDigestLog)
    private readonly weeklyDigestRepository: Repository<WeeklyDigestLog>,
    @InjectRepository(EmailMessage)
    private readonly messageRepository: Repository<EmailMessage>,
    @InjectRepository(DatasourceConnection)
    private readonly connectionRepository: Repository<DatasourceConnection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectQueue(Queues.EMAIL)
    private readonly emailQueue: Queue<SendEmailPayload>,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {}

  async listSenderProfiles(userId: string, limit = 30) {
    const profiles = await this.senderProfileRepository.find({
      where: { userId, status: 'active' },
      order: { lowValueScore: 'DESC' },
      take: limit,
    });

    const preferences = await this.getUserPreferences(userId);

    return {
      preferences,
      items: profiles.map((profile) => {
        const links = profile.unsubscribeLinks ?? [];
        return {
          id: profile.id,
          senderEmail: profile.senderEmail,
          senderName: profile.senderName,
          senderDomain: profile.senderDomain,
          messageCount30d: profile.messageCount30d,
          messageCount7d: profile.messageCount7d,
          readRate30d: profile.readRate30d,
          hasListUnsubscribe: profile.hasListUnsubscribe,
          unsubscribeLinks: links,
          marketingScore: profile.marketingScore,
          lowValueScore: profile.lowValueScore,
          disguisedMarketingScore: profile.disguisedMarketingScore,
          status: profile.status,
          exampleSubjects: profile.exampleSubjects ?? [],
          suggestedAction: getSuggestedAction(links),
        };
      }),
    };
  }

  async getPreferences(userId: string) {
    return this.getUserPreferences(userId);
  }

  async evaluateSenders(userId: string) {
    const connectionIds = await this.getUserConnectionIds(userId);
    if (connectionIds.length === 0) {
      return { evaluated: 0 };
    }

    const now = new Date();
    const since30 = new Date(now);
    since30.setDate(now.getDate() - 30);
    const since7 = new Date(now);
    since7.setDate(now.getDate() - 7);

    const rows = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin(
        EmailParticipant,
        'participant',
        '"participant"."message_id" = "message"."id" AND "participant"."role" = :role',
        { role: 'from' },
      )
      .where('"message"."connection_id" IN (:...connectionIds)', {
        connectionIds,
      })
      .andWhere('"message"."sent_at" >= :since30', { since30 })
      .select([
        '"message"."id" as "id"',
        '"message"."subject" as "subject"',
        '"message"."snippet" as "snippet"',
        '"message"."text_body" as "textBody"',
        '"message"."html_body" as "htmlBody"',
        '"message"."sent_at" as "sentAt"',
        '"message"."is_unread" as "isUnread"',
        '"message"."metadata" as "metadata"',
        '"participant"."email" as "senderEmail"',
        '"participant"."name" as "senderName"',
      ])
      .orderBy('"message"."sent_at"', 'DESC')
      .getRawMany<{
        id: string;
        subject: string | null;
        snippet: string | null;
        textBody: string | null;
        htmlBody: string | null;
        sentAt: Date | null;
        isUnread: boolean;
        metadata: Record<string, unknown> | null;
        senderEmail: string | null;
        senderName: string | null;
      }>();

    const aggregates = new Map<string, SenderAggregate>();

    for (const row of rows) {
      const sentAt = row.sentAt ? new Date(row.sentAt) : null;
      const senderKey = normalizeSenderKey(row.senderEmail, row.senderName);
      if (!senderKey) {
        continue;
      }
      const aggregate =
        aggregates.get(senderKey) ??
        ({
          senderKey,
          senderEmail: row.senderEmail,
          senderName: row.senderName,
          senderDomain: getSenderDomain(row.senderEmail),
          messageCount30d: 0,
          messageCount7d: 0,
          readCount30d: 0,
          hasListUnsubscribe: false,
          unsubscribeLinks: new Set<string>(),
          exampleSubjects: [],
          recentSubjects: [],
          latestMessage: null,
        } satisfies SenderAggregate);

      aggregate.messageCount30d += 1;
      if (sentAt && sentAt >= since7) {
        aggregate.messageCount7d += 1;
      }
      if (!row.isUnread) {
        aggregate.readCount30d += 1;
      }

      const metadata = row.metadata ?? {};
      const listUnsubscribe =
        typeof metadata.listUnsubscribe === 'string'
          ? metadata.listUnsubscribe
          : null;
      if (listUnsubscribe) {
        aggregate.hasListUnsubscribe = true;
      }

      const unsubscribeLinks = extractUnsubscribeLinks({
        text: row.textBody,
        html: row.htmlBody,
        snippet: row.snippet,
        listUnsubscribe,
      });
      for (const link of unsubscribeLinks) {
        aggregate.unsubscribeLinks.add(link);
      }

      if (row.subject && aggregate.exampleSubjects.length < 3) {
        aggregate.exampleSubjects.push(row.subject);
      }
      if (row.subject && aggregate.recentSubjects.length < 3) {
        aggregate.recentSubjects.push(row.subject);
      }

      if (!aggregate.latestMessage) {
        aggregate.latestMessage = {
          subject: row.subject,
          snippet: row.snippet,
          textBody: row.textBody,
          htmlBody: row.htmlBody,
          listUnsubscribe,
        };
      }

      aggregates.set(senderKey, aggregate);
    }

    const keys = Array.from(aggregates.keys());
    const existingProfiles = keys.length
      ? await this.senderProfileRepository.find({
          where: { userId, senderKey: In(keys) },
        })
      : [];
    const existingByKey = new Map(
      existingProfiles.map((profile) => [profile.senderKey, profile]),
    );

    const profilesToUpsert: SenderProfile[] = [];

    for (const aggregate of aggregates.values()) {
      const readRate30d =
        aggregate.messageCount30d > 0
          ? aggregate.readCount30d / aggregate.messageCount30d
          : 0;
      const volume = Math.min(aggregate.messageCount30d, 50) / 50;
      const engagement = 1 - readRate30d;

      const latest = aggregate.latestMessage;
      const preview =
        latest?.snippet ?? latest?.textBody ?? latest?.htmlBody ?? '';

      const classification = await this.llmService.classifyMarketing({
        userId,
        fromName: aggregate.senderName,
        fromEmail: aggregate.senderEmail,
        subject: latest?.subject ?? null,
        snippet: preview,
        listUnsubscribe: latest?.listUnsubscribe ?? null,
        recentSubjects: aggregate.recentSubjects,
      });

      const marketingScore = classification?.isMarketing
        ? classification.confidence
        : 0;
      const disguisedMarketingScore = classification?.isDisguisedMarketing
        ? classification.confidence
        : 0;

      const lowValueScore = clamp01(
        0.45 * volume + 0.35 * engagement + 0.2 * marketingScore,
      );

      const existing = existingByKey.get(aggregate.senderKey);
      const status: SenderProfileStatus = existing?.status ?? 'active';

      profilesToUpsert.push(
        this.senderProfileRepository.create({
          id: existing?.id,
          userId,
          senderKey: aggregate.senderKey,
          senderEmail: aggregate.senderEmail,
          senderDomain: aggregate.senderDomain,
          senderName: aggregate.senderName,
          messageCount30d: aggregate.messageCount30d,
          messageCount7d: aggregate.messageCount7d,
          readRate30d,
          hasListUnsubscribe: aggregate.hasListUnsubscribe,
          unsubscribeLinks: Array.from(aggregate.unsubscribeLinks),
          exampleSubjects: aggregate.exampleSubjects,
          marketingScore,
          lowValueScore,
          disguisedMarketingScore,
          lastEvaluatedAt: now,
          status,
        }),
      );
    }

    if (profilesToUpsert.length > 0) {
      await this.senderProfileRepository.upsert(profilesToUpsert, [
        'userId',
        'senderKey',
      ]);
    }

    await this.noiseEvaluationRepository.save(
      this.noiseEvaluationRepository.create({
        userId,
        senderCount: profilesToUpsert.length,
      }),
    );

    await this.ensurePreferences(userId);

    return { evaluated: profilesToUpsert.length };
  }

  async createBlockRule(input: {
    userId: string;
    senderProfileId: string;
    matchType?: BlockRuleMatchType;
    action: BlockRuleAction;
  }) {
    const profile = await this.senderProfileRepository.findOne({
      where: { id: input.senderProfileId, userId: input.userId },
    });
    if (!profile) {
      return { created: false };
    }

    const matchType =
      input.matchType ??
      (profile.senderEmail
        ? 'senderEmail'
        : profile.senderDomain
          ? 'senderDomain'
          : 'fromNameContains');

    const value =
      matchType === 'senderEmail'
        ? profile.senderEmail
        : matchType === 'senderDomain'
          ? profile.senderDomain
          : profile.senderName;

    if (!value) {
      return { created: false };
    }

    const rule = await this.blockRuleRepository.save(
      this.blockRuleRepository.create({
        userId: input.userId,
        matchType,
        value,
        action: input.action,
        enabled: true,
      }),
    );

    profile.status = 'blocked';
    await this.senderProfileRepository.save(profile);

    await this.unsubscribeEventRepository.save(
      this.unsubscribeEventRepository.create({
        userId: input.userId,
        senderProfileId: profile.id,
        actionType: 'blocked',
        metadata: {
          blockRuleId: rule.id,
          action: input.action,
        },
      }),
    );

    await this.applyBlockRuleToExistingMessages(input.userId, rule);

    return { created: true, ruleId: rule.id };
  }

  async recordUnsubscribeEvent(input: {
    userId: string;
    senderProfileId: string;
    actionType: UnsubscribeActionType;
    metadata?: Record<string, unknown> | null;
  }) {
    const profile = await this.senderProfileRepository.findOne({
      where: { id: input.senderProfileId, userId: input.userId },
    });
    if (!profile) {
      return { recorded: false };
    }

    await this.unsubscribeEventRepository.save(
      this.unsubscribeEventRepository.create({
        userId: input.userId,
        senderProfileId: input.senderProfileId,
        actionType: input.actionType,
        metadata: input.metadata ?? null,
      }),
    );

    if (
      input.actionType === 'opened_link' ||
      input.actionType === 'sent_mailto' ||
      input.actionType === 'marked_done'
    ) {
      profile.status = 'unsubscribed';
    } else if (input.actionType === 'blocked') {
      profile.status = 'blocked';
    } else if (input.actionType === 'ignored') {
      profile.status = 'ignored';
    }

    await this.senderProfileRepository.save(profile);

    return { recorded: true };
  }

  async buildUnsubscribePlan(userId: string, senderProfileIds: string[]) {
    const profiles = await this.senderProfileRepository.find({
      where: { userId, id: In(senderProfileIds) },
    });

    const items: UnsubscribePlanItem[] = [];

    for (const profile of profiles) {
      const links = profile.unsubscribeLinks ?? [];
      const validLinks = links
        .map((link) => {
          try {
            const url = new URL(link);
            if (url.protocol === 'mailto:' || url.protocol.startsWith('http')) {
              return link;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((link): link is string => Boolean(link));

      const mailtoLink = validLinks.find((link) => link.startsWith('mailto:'));
      const mailtoDraft = mailtoLink ? parseMailto(mailtoLink) : null;

      items.push({
        senderProfileId: profile.id,
        senderEmail: profile.senderEmail,
        senderName: profile.senderName,
        messageCount30d: profile.messageCount30d,
        lowValueScore: profile.lowValueScore,
        suggestedAction: getSuggestedAction(validLinks),
        mailtoDraft: mailtoDraft ?? undefined,
        links: validLinks.filter(
          (link) => link.startsWith('http://') || link.startsWith('https://'),
        ),
      });
    }

    return { items };
  }

  async updatePreferences(
    userId: string,
    input: { weeklyCleanupDigestEnabled: boolean },
  ) {
    const existing = await this.userPreferencesRepository.findOne({
      where: { userId },
    });

    if (existing) {
      existing.weeklyCleanupDigestEnabled = input.weeklyCleanupDigestEnabled;
      await this.userPreferencesRepository.save(existing);
      return existing;
    }

    return await this.userPreferencesRepository.save(
      this.userPreferencesRepository.create({
        userId,
        weeklyCleanupDigestEnabled: input.weeklyCleanupDigestEnabled,
      }),
    );
  }

  async matchBlockRuleForMessage(input: BlockRuleMatchInput) {
    const rules = await this.blockRuleRepository.find({
      where: { userId: input.userId, enabled: true },
      order: { createdAt: 'ASC' },
    });

    const senderEmail = input.senderEmail?.toLowerCase() ?? null;
    const senderDomain = input.senderDomain?.toLowerCase() ?? null;
    const senderName = input.senderName?.toLowerCase() ?? null;
    const subject = input.subject?.toLowerCase() ?? null;

    for (const rule of rules) {
      const ruleValue = rule.value.toLowerCase();
      if (rule.matchType === 'senderEmail' && senderEmail === ruleValue) {
        return rule;
      }
      if (rule.matchType === 'senderDomain' && senderDomain === ruleValue) {
        return rule;
      }
      if (
        rule.matchType === 'subjectContains' &&
        subject &&
        subject.includes(ruleValue)
      ) {
        return rule;
      }
      if (
        rule.matchType === 'fromNameContains' &&
        senderName &&
        senderName.includes(ruleValue)
      ) {
        return rule;
      }
    }

    return null;
  }

  async processWeeklyDigest() {
    const emailConfig =
      this.configService.get<AppConfigurationType['email']>('email');
    const templateId = emailConfig?.templates?.weeklyCleanupDigest;
    if (!templateId) {
      this.logger.warn('Weekly digest template is not configured.');
      return { skipped: true };
    }

    const userIdsWithProfiles = await this.senderProfileRepository
      .createQueryBuilder('profile')
      .select('DISTINCT "profile"."user_id"', 'userId')
      .getRawMany<{ userId: string }>();
    const userIds = userIdsWithProfiles.map((row) => row.userId);
    if (userIds.length === 0) {
      return { skipped: true };
    }

    const preferences = await this.userPreferencesRepository.find({
      where: { userId: In(userIds) },
    });
    const prefsByUser = new Map(preferences.map((pref) => [pref.userId, pref]));

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: { id: true, email: true },
    });

    for (const user of users) {
      const pref = prefsByUser.get(user.id);
      if (pref && !pref.weeklyCleanupDigestEnabled) {
        continue;
      }

      const profiles = await this.senderProfileRepository.find({
        where: {
          userId: user.id,
          status: In(['active', 'ignored']),
        },
        order: { lowValueScore: 'DESC' },
        take: 30,
      });

      const filtered = profiles.filter(
        (profile) =>
          profile.status !== 'blocked' &&
          profile.status !== 'unsubscribed' &&
          profile.status !== 'important',
      );

      if (filtered.length === 0) {
        continue;
      }

      await this.emailQueue.add('weekly-cleanup-digest', {
        templateId,
        to: user.email,
        payload: {
          senders: filtered.map((profile) => ({
            senderName: profile.senderName,
            senderEmail: profile.senderEmail,
            messageCount30d: profile.messageCount30d,
            lowValueScore: profile.lowValueScore,
          })),
        },
      });

      await this.weeklyDigestRepository.save(
        this.weeklyDigestRepository.create({
          userId: user.id,
          senderCount: filtered.length,
        }),
      );
    }

    return { queued: true };
  }

  private async getUserConnectionIds(userId: string) {
    const connections = await this.connectionRepository.find({
      where: { userId },
      select: { id: true },
    });
    return connections.map((connection) => connection.id);
  }

  private async getUserPreferences(userId: string) {
    const prefs = await this.userPreferencesRepository.findOne({
      where: { userId },
    });
    if (!prefs) {
      return {
        weeklyCleanupDigestEnabled: true,
      };
    }
    return {
      weeklyCleanupDigestEnabled: prefs.weeklyCleanupDigestEnabled,
    };
  }

  private async ensurePreferences(userId: string) {
    const existing = await this.userPreferencesRepository.findOne({
      where: { userId },
    });
    if (!existing) {
      await this.userPreferencesRepository.save(
        this.userPreferencesRepository.create({ userId }),
      );
    }
  }

  private async applyBlockRuleToExistingMessages(
    userId: string,
    rule: BlockRule,
  ) {
    const ids = await this.messageRepository
      .createQueryBuilder('message')
      .select('"message"."id"', 'id')
      .innerJoin(
        EmailParticipant,
        'participant',
        '"participant"."message_id" = "message"."id" AND "participant"."role" = :role',
        { role: 'from' },
      )
      .innerJoin(
        DatasourceConnection,
        'connection',
        '"connection"."id" = "message"."connection_id"',
      )
      .where('"connection"."user_id" = :userId', { userId })
      .andWhere(
        (() => {
          if (rule.matchType === 'senderEmail') {
            return 'LOWER("participant"."email") = :value';
          }
          if (rule.matchType === 'senderDomain') {
            return 'LOWER(SPLIT_PART("participant"."email", \'@\', 2)) = :value';
          }
          if (rule.matchType === 'subjectContains') {
            return 'LOWER("message"."subject") LIKE :value';
          }
          return 'LOWER("participant"."name") LIKE :value';
        })(),
        {
          value:
            rule.matchType === 'subjectContains' ||
            rule.matchType === 'fromNameContains'
              ? `%${rule.value.toLowerCase()}%`
              : rule.value.toLowerCase(),
        },
      )
      .getRawMany<{ id: string }>();

    const messageIds = ids.map((row) => row.id);
    if (messageIds.length === 0) {
      return;
    }

    await this.messageRepository.update(
      { id: In(messageIds) },
      {
        isBlocked: true,
        isArchived: rule.action === 'archive',
        isNoise: rule.action === 'moveToNoise',
        blockRuleId: rule.id,
      },
    );
  }
}
