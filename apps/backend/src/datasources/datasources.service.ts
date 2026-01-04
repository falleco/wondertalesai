import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobsService } from '@server/jobs/jobs.service';
import { EmailAnalysis } from '@server/llm/entities/email-analysis.entity';
import { ThreadAnalysis } from '@server/llm/entities/thread-analysis.entity';
import { SenderProfile } from '@server/noise/entities/sender-profile.entity';
import { WorkflowRule } from '@server/workflow/entities/workflow-rule.entity';
import { In, Repository } from 'typeorm';
import { DatasourceConnection } from './datasource-connection.entity';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLabel } from './email-label.entity';
import { EmailMessage } from './email-message.entity';
import { EmailMessageLabel } from './email-message-label.entity';
import { EmailParticipant } from './email-participant.entity';
import { EmailThread } from './email-thread.entity';
import { GmailService } from './gmail.service';
import { JmapService } from './jmap.service';

@Injectable()
export class DatasourcesService {
  constructor(
    @InjectRepository(DatasourceConnection)
    private readonly connectionRepository: Repository<DatasourceConnection>,
    @InjectRepository(EmailMessage)
    private readonly messageRepository: Repository<EmailMessage>,
    @InjectRepository(EmailThread)
    private readonly threadRepository: Repository<EmailThread>,
    @InjectRepository(EmailParticipant)
    private readonly participantRepository: Repository<EmailParticipant>,
    @InjectRepository(EmailLabel)
    private readonly labelRepository: Repository<EmailLabel>,
    @InjectRepository(EmailMessageLabel)
    private readonly messageLabelRepository: Repository<EmailMessageLabel>,
    @InjectRepository(EmailAttachment)
    private readonly attachmentRepository: Repository<EmailAttachment>,
    @InjectRepository(EmailAnalysis)
    private readonly emailAnalysisRepository: Repository<EmailAnalysis>,
    @InjectRepository(ThreadAnalysis)
    private readonly threadAnalysisRepository: Repository<ThreadAnalysis>,
    @InjectRepository(SenderProfile)
    private readonly senderProfileRepository: Repository<SenderProfile>,
    @InjectRepository(WorkflowRule)
    private readonly workflowRuleRepository: Repository<WorkflowRule>,
    private readonly jobsService: JobsService,
    private readonly gmailService: GmailService,
    private readonly jmapService: JmapService,
  ) {}

  async getDashboardSummary(userId: string) {
    const connections = await this.connectionRepository.find({
      where: { userId },
      select: {
        id: true,
        providerEmail: true,
      },
    });

    const connectionIds = connections.map((connection) => connection.id);
    const userEmails = connections
      .map((connection) => connection.providerEmail)
      .filter((email): email is string => Boolean(email))
      .map((email) => email.toLowerCase());

    const totalConnections = connectionIds.length;
    const totalEmails = totalConnections
      ? await this.messageRepository.count({
          where: { connectionId: In(connectionIds) },
        })
      : 0;

    if (connectionIds.length === 0) {
      return {
        stats: { totalConnections, totalEmails },
        inboxHealth: this.buildInboxHealthSummary({
          loadCount: 0,
          importantShare: 0,
          noiseShare: 0,
          avgResponseHours: null,
          automationsCount: 0,
          newslettersUnsubscribed: 0,
          previousScore: 0,
        }),
        controlRoom: {
          criticalToday: [],
          pendingTasks: [],
          upcomingDeadlines: [],
          unreadImportant: [],
          importantThreads: [],
        },
      };
    }

    const now = new Date();
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [currentCounts, previousCounts] = await Promise.all([
      this.getHealthCounts(connectionIds, start7d, now),
      this.getHealthCounts(connectionIds, start14d, start7d),
    ]);

    const [avgResponseHours, previousResponseHours] = await Promise.all([
      this.getAverageResponseHours(connectionIds, userEmails, start7d, now),
      this.getAverageResponseHours(
        connectionIds,
        userEmails,
        start14d,
        start7d,
      ),
    ]);

    const [automationsCount, newslettersUnsubscribed] = await Promise.all([
      this.workflowRuleRepository.count({ where: { userId } }),
      this.senderProfileRepository.count({
        where: { userId, status: 'unsubscribed' },
      }),
    ]);

    const currentScore = this.calculateInboxHealthScore({
      loadCount: currentCounts.total,
      importantShare: currentCounts.importantShare,
      noiseShare: currentCounts.noiseShare,
      avgResponseHours,
      automationsCount,
      newslettersUnsubscribed,
    });
    const previousScore = this.calculateInboxHealthScore({
      loadCount: previousCounts.total,
      importantShare: previousCounts.importantShare,
      noiseShare: previousCounts.noiseShare,
      avgResponseHours: previousResponseHours,
      automationsCount,
      newslettersUnsubscribed,
    });

    const controlRoom = await this.buildControlRoom(
      connectionIds,
      start30d,
      now,
    );

    return {
      stats: { totalConnections, totalEmails },
      inboxHealth: this.buildInboxHealthSummary({
        loadCount: currentCounts.total,
        importantShare: currentCounts.importantShare,
        noiseShare: currentCounts.noiseShare,
        avgResponseHours,
        automationsCount,
        newslettersUnsubscribed,
        previousScore,
        currentScore,
      }),
      controlRoom,
    };
  }

  private async getHealthCounts(
    connectionIds: string[],
    start: Date,
    end: Date,
  ) {
    const baseQuery = this.messageRepository
      .createQueryBuilder('message')
      .where('message.connectionId IN (:...connectionIds)', {
        connectionIds,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) >= :start', {
        start,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) < :end', { end });

    const [total, importantCount, noiseCount] = await Promise.all([
      baseQuery.getCount(),
      baseQuery.clone().andWhere('message.triageIsCritical = true').getCount(),
      baseQuery.clone().andWhere('message.isNoise = true').getCount(),
    ]);

    const safeTotal = total || 0;
    return {
      total: safeTotal,
      importantShare: safeTotal ? importantCount / safeTotal : 0,
      noiseShare: safeTotal ? noiseCount / safeTotal : 0,
    };
  }

  private async getAverageResponseHours(
    connectionIds: string[],
    userEmails: string[],
    start: Date,
    end: Date,
  ) {
    if (connectionIds.length === 0 || userEmails.length === 0) {
      return null;
    }

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .addSelect(
        'COALESCE(message.sentAt, message.createdAt)',
        'message_timestamp',
      )
      .where('message.connectionId IN (:...connectionIds)', {
        connectionIds,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) >= :start', {
        start,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) < :end', { end })
      .orderBy('message_timestamp', 'ASC')
      .take(500)
      .getMany();

    if (messages.length === 0) {
      return null;
    }

    const messageIds = messages.map((message) => message.id);
    const fromParticipants = await this.participantRepository.find({
      where: { messageId: In(messageIds), role: 'from' },
    });
    const senderByMessage = new Map(
      fromParticipants.map((participant) => [
        participant.messageId,
        participant.email.toLowerCase(),
      ]),
    );

    const userEmailSet = new Set(
      userEmails.map((email) => email.toLowerCase()),
    );
    const threadMap = new Map<string, EmailMessage[]>();

    for (const message of messages) {
      if (!message.threadId) {
        continue;
      }
      const list = threadMap.get(message.threadId) ?? [];
      list.push(message);
      threadMap.set(message.threadId, list);
    }

    const responseDurations: number[] = [];

    for (const threadMessages of threadMap.values()) {
      const sorted = threadMessages.slice().sort((a, b) => {
        const aTime = (a.sentAt ?? a.createdAt).getTime();
        const bTime = (b.sentAt ?? b.createdAt).getTime();
        return aTime - bTime;
      });

      let lastIncomingAt: Date | null = null;

      for (const message of sorted) {
        const timestamp = message.sentAt ?? message.createdAt;
        const sender = senderByMessage.get(message.id);
        const isFromUser = sender ? userEmailSet.has(sender) : false;

        if (!isFromUser) {
          lastIncomingAt = timestamp;
          continue;
        }

        if (lastIncomingAt) {
          responseDurations.push(
            timestamp.getTime() - lastIncomingAt.getTime(),
          );
          lastIncomingAt = null;
        }
      }
    }

    if (responseDurations.length === 0) {
      return null;
    }

    const averageMs =
      responseDurations.reduce((acc, value) => acc + value, 0) /
      responseDurations.length;
    return Number((averageMs / (1000 * 60 * 60)).toFixed(2));
  }

  private calculateInboxHealthScore(input: {
    loadCount: number;
    importantShare: number;
    noiseShare: number;
    avgResponseHours: number | null;
    automationsCount: number;
    newslettersUnsubscribed: number;
  }) {
    const normalize = (value: number, max: number) =>
      Math.min(1, Math.max(0, value / max));
    const clamp = (value: number) => Math.min(100, Math.max(0, value));

    const loadScore = (1 - normalize(input.loadCount, 200)) * 25;
    const importantScore = input.importantShare * 25;
    const noiseScore = (1 - input.noiseShare) * 20;
    const responseScore =
      input.avgResponseHours === null
        ? 10
        : (1 - normalize(input.avgResponseHours, 48)) * 20;
    const automationScore = normalize(input.automationsCount, 10) * 5;
    const unsubscribeScore = normalize(input.newslettersUnsubscribed, 30) * 5;

    return clamp(
      loadScore +
        importantScore +
        noiseScore +
        responseScore +
        automationScore +
        unsubscribeScore,
    );
  }

  private buildInboxHealthSummary(input: {
    loadCount: number;
    importantShare: number;
    noiseShare: number;
    avgResponseHours: number | null;
    automationsCount: number;
    newslettersUnsubscribed: number;
    previousScore: number;
    currentScore?: number;
  }) {
    const currentScore = input.currentScore ?? 0;
    const trend = Number((currentScore - input.previousScore).toFixed(1));
    const message =
      trend > 0
        ? `Your inbox efficiency improved ${trend}% this week!`
        : trend < 0
          ? `Your inbox efficiency declined ${Math.abs(trend)}% this week.`
          : 'Your inbox efficiency held steady this week.';

    return {
      score: Math.round(currentScore),
      trend,
      message,
      metrics: {
        inboxLoad: input.loadCount,
        importantShare: Math.round(input.importantShare * 100),
        noiseShare: Math.round(input.noiseShare * 100),
        avgResponseHours: input.avgResponseHours,
        automationsCount: input.automationsCount,
        newslettersUnsubscribed: input.newslettersUnsubscribed,
      },
    };
  }

  private async buildControlRoom(
    connectionIds: string[],
    start: Date,
    end: Date,
  ) {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .addSelect(
        'COALESCE(message.sentAt, message.createdAt)',
        'message_timestamp',
      )
      .where('message.connectionId IN (:...connectionIds)', {
        connectionIds,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) >= :start', {
        start,
      })
      .andWhere('COALESCE(message.sentAt, message.createdAt) < :end', { end })
      .orderBy('message_timestamp', 'DESC')
      .take(300)
      .getMany();

    const messageIds = messages.map((message) => message.id);
    const [participants, analyses] = await Promise.all([
      messageIds.length
        ? this.participantRepository.find({
            where: { messageId: In(messageIds), role: 'from' },
          })
        : [],
      messageIds.length
        ? this.emailAnalysisRepository.find({
            where: { messageId: In(messageIds) },
          })
        : [],
    ]);

    const fromByMessageId = new Map(
      participants.map((participant) => [participant.messageId, participant]),
    );
    const analysisByMessageId = new Map(
      analyses.map((analysis) => [analysis.messageId, analysis]),
    );

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const criticalToday = messages
      .filter((message) => {
        const timestamp = message.sentAt ?? message.createdAt;
        return message.triageIsCritical && timestamp >= dayAgo;
      })
      .slice(0, 5)
      .map((message) => {
        const from = fromByMessageId.get(message.id);
        const analysis = analysisByMessageId.get(message.id);
        return {
          messageId: message.id,
          subject: message.subject ?? '(no subject)',
          summary:
            message.triageSummary ?? analysis?.summary ?? message.snippet ?? '',
          sentAt: (message.sentAt ?? message.createdAt).toISOString(),
          from: from
            ? { name: from.name, email: from.email }
            : { name: null, email: '' },
        };
      });

    const unreadImportant = messages
      .filter((message) => message.isUnread && message.triageIsCritical)
      .slice(0, 5)
      .map((message) => {
        const from = fromByMessageId.get(message.id);
        return {
          messageId: message.id,
          subject: message.subject ?? '(no subject)',
          sentAt: (message.sentAt ?? message.createdAt).toISOString(),
          from: from
            ? { name: from.name, email: from.email }
            : { name: null, email: '' },
        };
      });

    const pendingTasks: Array<{
      messageId: string;
      title: string;
      dueDate: string | null;
      from: { name: string | null; email: string };
    }> = [];
    const upcomingDeadlines: typeof pendingTasks = [];
    const taskKeySet = new Set<string>();

    const extractTasks = (
      message: EmailMessage,
      analysis: EmailAnalysis | undefined,
    ) => {
      const tasks: Array<{ title: string; dueDate: string | null }> = [];
      if (Array.isArray(message.triageActionItems)) {
        for (const action of message.triageActionItems) {
          if (action?.task) {
            tasks.push({
              title: action.task,
              dueDate: action.dueDate ?? null,
            });
          }
        }
      }

      if (Array.isArray(analysis?.actions)) {
        for (const action of analysis.actions) {
          const title = typeof action.title === 'string' ? action.title : null;
          if (!title) {
            continue;
          }
          const dueDate =
            typeof action.dueDate === 'string' ? action.dueDate : null;
          tasks.push({ title, dueDate });
        }
      }

      return tasks;
    };

    for (const message of messages) {
      const analysis = analysisByMessageId.get(message.id);
      const from = fromByMessageId.get(message.id);
      const sender = from
        ? { name: from.name, email: from.email }
        : { name: null, email: '' };
      const tasks = extractTasks(message, analysis);
      for (const task of tasks) {
        const key = `${message.id}|${task.title}|${task.dueDate ?? ''}`;
        if (taskKeySet.has(key)) {
          continue;
        }
        taskKeySet.add(key);

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const safeDueDate =
          dueDate && Number.isFinite(dueDate.getTime()) ? dueDate : null;
        const entry = {
          messageId: message.id,
          title: task.title,
          dueDate: safeDueDate ? safeDueDate.toISOString() : null,
          from: sender,
        };

        if (safeDueDate && safeDueDate >= now) {
          upcomingDeadlines.push(entry);
        } else {
          pendingTasks.push(entry);
        }
      }
    }

    pendingTasks.sort((a, b) => a.title.localeCompare(b.title));
    upcomingDeadlines.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate) {
        return -1;
      }
      if (b.dueDate) {
        return 1;
      }
      return 0;
    });

    const importantThreadIds = Array.from(
      new Set(
        messages
          .filter((message) => message.triageIsCritical && message.threadId)
          .map((message) => message.threadId as string),
      ),
    );

    const threads = importantThreadIds.length
      ? await this.threadRepository.find({
          where: { id: In(importantThreadIds) },
        })
      : [];
    const threadAnalyses = importantThreadIds.length
      ? await this.threadAnalysisRepository.find({
          where: { threadId: In(importantThreadIds) },
        })
      : [];
    const analysisByThreadId = new Map(
      threadAnalyses.map((analysis) => [analysis.threadId, analysis]),
    );
    const latestMessageByThreadId = new Map<string, EmailMessage>();
    for (const message of messages) {
      if (!message.threadId) {
        continue;
      }
      const existing = latestMessageByThreadId.get(message.threadId);
      if (!existing) {
        latestMessageByThreadId.set(message.threadId, message);
        continue;
      }
      const existingTime = existing.sentAt ?? existing.createdAt;
      const currentTime = message.sentAt ?? message.createdAt;
      if (currentTime > existingTime) {
        latestMessageByThreadId.set(message.threadId, message);
      }
    }

    const importantThreads = threads
      .map((thread) => {
        const analysis = analysisByThreadId.get(thread.id);
        const latest = latestMessageByThreadId.get(thread.id);
        return {
          threadId: thread.id,
          messageId: latest?.id ?? null,
          subject: thread.subject ?? 'Thread',
          summary:
            analysis?.summary ??
            thread.snippet ??
            'Thread summary unavailable.',
          lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return b.lastMessageAt.localeCompare(a.lastMessageAt);
        }
        if (a.lastMessageAt) {
          return -1;
        }
        if (b.lastMessageAt) {
          return 1;
        }
        return 0;
      })
      .slice(0, 5);

    return {
      criticalToday,
      pendingTasks: pendingTasks.slice(0, 6),
      upcomingDeadlines: upcomingDeadlines.slice(0, 6),
      unreadImportant,
      importantThreads,
    };
  }

  async listConnections(userId: string) {
    const connections = await this.connectionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return connections.map((connection) => ({
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      email: connection.providerEmail,
      lastSyncedAt: connection.lastSyncedAt,
      createdAt: connection.createdAt,
    }));
  }

  async getEmailInbox(
    userId: string,
    input?: { page?: number; pageSize?: number },
  ) {
    const pageSize = Math.min(Math.max(input?.pageSize ?? 20, 1), 50);
    const page = Math.max(input?.page ?? 1, 1);

    const connections = await this.connectionRepository.find({
      where: { userId },
      select: {
        id: true,
      },
    });

    const connectionIds = connections.map((connection) => connection.id);
    const totalConnections = connectionIds.length;

    if (connectionIds.length === 0) {
      return {
        stats: {
          totalConnections,
          totalEmails: 0,
        },
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
        emails: [],
      };
    }

    const totalEmails = await this.messageRepository.count({
      where: { connectionId: In(connectionIds) },
    });

    const messages = await this.messageRepository.find({
      where: { connectionId: In(connectionIds) },
      order: { sentAt: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        subject: true,
        snippet: true,
        sentAt: true,
        isUnread: true,
      },
    });

    const messageIds = messages.map((message) => message.id);
    const fromParticipants = messageIds.length
      ? await this.participantRepository.find({
          where: {
            messageId: In(messageIds),
            role: 'from',
          },
        })
      : [];

    const fromByMessageId = new Map(
      fromParticipants.map((participant) => [
        participant.messageId,
        participant,
      ]),
    );

    return {
      stats: {
        totalConnections,
        totalEmails,
      },
      pagination: {
        page,
        pageSize,
        total: totalEmails,
        totalPages: Math.ceil(totalEmails / pageSize),
      },
      emails: messages.map((message) => {
        const from = fromByMessageId.get(message.id);
        return {
          id: message.id,
          subject: message.subject,
          snippet: message.snippet,
          sentAt: message.sentAt,
          isUnread: message.isUnread,
          from: from
            ? {
                name: from.name,
                email: from.email,
              }
            : null,
        };
      }),
    };
  }

  async getEmailDetails(userId: string, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      return null;
    }

    const connection = await this.connectionRepository.findOne({
      where: { id: message.connectionId, userId },
    });

    if (!connection) {
      return null;
    }

    const participants = await this.participantRepository.find({
      where: { messageId: message.id },
      order: { createdAt: 'ASC' },
    });

    const messageLabels = await this.messageLabelRepository.find({
      where: { messageId: message.id },
    });

    const labelIds = messageLabels.map((label) => label.labelId);
    const labels = labelIds.length
      ? await this.labelRepository.find({
          where: { id: In(labelIds) },
        })
      : [];

    const thread = message.threadId
      ? await this.threadRepository.findOne({
          where: { id: message.threadId },
        })
      : null;

    const emailAnalysis = await this.emailAnalysisRepository.findOne({
      where: { messageId: message.id },
    });

    const threadAnalysis = thread
      ? await this.threadAnalysisRepository.findOne({
          where: { threadId: thread.id },
        })
      : null;

    const byRole = (role: string) =>
      participants
        .filter((participant) => participant.role === role)
        .map((participant) => ({
          name: participant.name,
          email: participant.email,
        }));

    return {
      id: message.id,
      subject: message.subject,
      snippet: message.snippet,
      textBody: message.textBody,
      htmlBody: message.htmlBody,
      sentAt: message.sentAt,
      isUnread: message.isUnread,
      provider: connection.provider,
      labels: labels.map((label) => ({
        id: label.id,
        name: label.name,
        type: label.type,
      })),
      participants: {
        from: byRole('from'),
        to: byRole('to'),
        cc: byRole('cc'),
        bcc: byRole('bcc'),
        replyTo: byRole('reply-to'),
      },
      thread: thread
        ? {
            id: thread.id,
            subject: thread.subject,
            messageCount: thread.messageCount,
            unreadCount: thread.unreadCount,
          }
        : null,
      llm: {
        email: emailAnalysis
          ? {
              summary: emailAnalysis.summary,
              tags: emailAnalysis.tags,
              keywords: emailAnalysis.keywords,
              actions: emailAnalysis.actions,
            }
          : null,
        thread: threadAnalysis
          ? {
              summary: threadAnalysis.summary,
              tags: threadAnalysis.tags,
              keywords: threadAnalysis.keywords,
              actions: threadAnalysis.actions,
            }
          : null,
      },
    };
  }

  async removeConnection(userId: string, connectionId: string) {
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      return { removed: false };
    }

    await this.connectionRepository.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(EmailAttachment)
        .where(
          '"message_id" IN (SELECT id FROM email_message WHERE connection_id = :connectionId)',
          { connectionId },
        )
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(EmailParticipant)
        .where(
          '"message_id" IN (SELECT id FROM email_message WHERE connection_id = :connectionId)',
          { connectionId },
        )
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(EmailMessageLabel)
        .where(
          '"message_id" IN (SELECT id FROM email_message WHERE connection_id = :connectionId)',
          { connectionId },
        )
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(EmailMessage)
        .where('connection_id = :connectionId', { connectionId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(EmailLabel)
        .where('connection_id = :connectionId', { connectionId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(EmailThread)
        .where('connection_id = :connectionId', { connectionId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(DatasourceConnection)
        .where('id = :connectionId', { connectionId })
        .execute();
    });

    return { removed: true };
  }

  async forceReprocessConnection(userId: string, connectionId: string) {
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      return { queued: false };
    }

    await this.messageRepository.update(
      { connectionId: connection.id },
      { llmProcessed: false, llmProcessedAt: null },
    );

    await this.threadRepository.update(
      { connectionId: connection.id },
      { llmProcessed: false, llmProcessedAt: null },
    );

    await this.attachmentRepository
      .createQueryBuilder()
      .update(EmailAttachment)
      .set({ llmProcessed: false, llmProcessedAt: null })
      .where(
        '"message_id" IN (SELECT id FROM email_message WHERE connection_id = :connectionId)',
        { connectionId: connection.id },
      )
      .execute();

    const messages = await this.messageRepository.find({
      where: { connectionId: connection.id },
      select: { id: true, threadId: true },
    });

    for (const message of messages) {
      await this.jobsService.enqueueLlmAnalysis({
        type: 'email',
        userId: connection.userId,
        messageId: message.id,
        threadId: message.threadId ?? undefined,
      });
    }

    const attachments = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .select(['attachment.id'])
      .where(
        '"attachment"."message_id" IN (SELECT id FROM email_message WHERE connection_id = :connectionId)',
        { connectionId: connection.id },
      )
      .getMany();

    for (const attachment of attachments) {
      await this.jobsService.enqueueLlmAnalysis({
        type: 'attachment',
        userId: connection.userId,
        attachmentId: attachment.id,
      });
    }

    if (connection.provider === 'gmail') {
      await this.jobsService.enqueueGmailSync({
        connectionId: connection.id,
        reason: 'manual',
      });
    } else if (this.jmapService.isJmapProvider(connection.provider)) {
      await this.jobsService.enqueueJmapSync({
        connectionId: connection.id,
        reason: 'manual',
      });
    }

    return { queued: true };
  }

  async connectFastmail(userId: string, startDate?: string | null) {
    return this.jmapService.connectFastmail(userId, startDate);
  }

  async createGmailAuthUrl(
    userId: string,
    redirectTo?: string | null,
    startDate?: string | null,
  ) {
    return this.gmailService.createGmailAuthUrl(userId, redirectTo, startDate);
  }

  async handleGmailCallback(code: string, state: string) {
    return this.gmailService.handleGmailCallback(code, state);
  }

  async handleGmailPushNotification(payload: { message?: { data?: string } }) {
    return this.gmailService.handleGmailPushNotification(payload);
  }

  async syncEmailConnection(payload: {
    connectionId: string;
    triggerHistoryId?: string;
  }) {
    const connection = await this.connectionRepository.findOne({
      where: { id: payload.connectionId },
    });

    if (!connection) {
      return { skipped: true };
    }

    if (connection.provider === 'gmail') {
      return this.gmailService.syncGmailMailbox(
        connection,
        payload.triggerHistoryId,
      );
    }

    return { skipped: true };
  }

  async syncJmapConnection(payload: { connectionId: string }) {
    const connection = await this.connectionRepository.findOne({
      where: { id: payload.connectionId },
    });

    if (!connection) {
      return { skipped: true };
    }

    if (!this.jmapService.isJmapProvider(connection.provider)) {
      return { skipped: true };
    }

    return this.jmapService.syncJmapConnection(connection);
  }
}
