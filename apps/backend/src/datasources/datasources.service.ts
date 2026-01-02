import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobsService } from '@server/jobs/jobs.service';
import { EmailAnalysis } from '@server/llm/email-analysis.entity';
import { ThreadAnalysis } from '@server/llm/thread-analysis.entity';
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
    private readonly jobsService: JobsService,
    private readonly gmailService: GmailService,
    private readonly jmapService: JmapService,
  ) {}

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
