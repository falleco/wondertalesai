import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { type AppConfigurationType } from '@server/config/configuration';
import { ContactsService } from '@server/contacts/contacts.service';
import { JobsService } from '@server/jobs/jobs.service';
import { In, Repository } from 'typeorm';
import {
  DatasourceConnection,
  type DatasourceProvider,
} from './datasource-connection.entity';
import {
  buildContactEntries,
  getSyncStartAt,
  type ParsedAddress,
  parseSyncStartAt,
} from './datasources.utils';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLabel } from './email-label.entity';
import { EmailMessage } from './email-message.entity';
import { EmailMessageLabel } from './email-message-label.entity';
import { EmailParticipant } from './email-participant.entity';
import { EmailThread } from './email-thread.entity';

const FASTMAIL_SESSION_URL = 'https://api.fastmail.com/.well-known/jmap';
const JMAP_USING = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'];
const JMAP_PAGE_LIMIT = 50;
const JMAP_PROVIDERS: DatasourceProvider[] = ['fastmail'];

type JmapSession = {
  apiUrl: string;
  downloadUrl?: string;
  accounts: Record<
    string,
    {
      name: string;
      isPersonal: boolean;
      isReadOnly: boolean;
      accountCapabilities?: Record<string, unknown>;
    }
  >;
  primaryAccounts?: Record<string, string>;
  username?: string;
};

type JmapMethodCall = [string, Record<string, unknown>, string];

type JmapMailbox = {
  id: string;
  name: string;
  role?: string | null;
};

type JmapEmailAddress = {
  name?: string | null;
  email?: string | null;
};

type JmapBodyPart = {
  partId?: string | null;
  blobId?: string | null;
  size?: number | null;
  type?: string | null;
  name?: string | null;
  charset?: string | null;
  disposition?: string | null;
  cid?: string | null;
  subParts?: JmapBodyPart[];
};

type JmapBodyValue = {
  value?: string;
  isTruncated?: boolean;
};

type JmapEmail = {
  id: string;
  threadId: string;
  mailboxIds?: Record<string, boolean>;
  subject?: string | null;
  preview?: string | null;
  receivedAt?: string | null;
  sentAt?: string | null;
  from?: JmapEmailAddress[];
  to?: JmapEmailAddress[];
  cc?: JmapEmailAddress[];
  bcc?: JmapEmailAddress[];
  replyTo?: JmapEmailAddress[];
  messageId?: string[];
  keywords?: Record<string, boolean>;
  bodyStructure?: JmapBodyPart;
  bodyValues?: Record<string, JmapBodyValue>;
  textBody?: JmapBodyPart[];
  htmlBody?: JmapBodyPart[];
  attachments?: JmapBodyPart[];
};

type JmapMethodResponse = {
  methodResponses: [string, Record<string, unknown>, string][];
};

type JmapEmailQueryResponse = {
  ids: string[];
  queryState: string;
};

type JmapEmailQueryChangesResponse = {
  added?: { id: string; index?: number }[];
  removed?: string[];
  newQueryState: string;
};

type JmapEmailGetResponse = {
  list: JmapEmail[];
};

type JmapMailboxGetResponse = {
  list: JmapMailbox[];
};

type JmapAttachment = {
  blobId: string;
  name?: string | null;
  type?: string | null;
  size?: number | null;
  disposition?: string | null;
  cid?: string | null;
};

type JmapExtractedContent = {
  textBody: string | null;
  htmlBody: string | null;
  attachments: JmapAttachment[];
};

const normalizeJmapAddresses = (
  addresses?: JmapEmailAddress[],
): ParsedAddress[] => {
  if (!addresses) {
    return [];
  }
  return addresses
    .map((address) => ({
      name: address.name?.trim() || null,
      email: address.email?.trim() || '',
    }))
    .filter((address) => Boolean(address.email));
};

const flattenJmapParts = (part?: JmapBodyPart): JmapBodyPart[] => {
  if (!part) {
    return [];
  }
  const parts = [part];
  if (part.subParts?.length) {
    for (const child of part.subParts) {
      parts.push(...flattenJmapParts(child));
    }
  }
  return parts;
};

const pickJmapBodyValue = (
  parts: JmapBodyPart[] | undefined,
  bodyValues: Record<string, JmapBodyValue> | undefined,
) => {
  if (!parts || !bodyValues) {
    return null;
  }
  for (const part of parts) {
    if (!part.partId) {
      continue;
    }
    const value = bodyValues[part.partId]?.value;
    if (value) {
      return value;
    }
  }
  return null;
};

const buildJmapContent = (email: JmapEmail): JmapExtractedContent => {
  const textBody = pickJmapBodyValue(email.textBody, email.bodyValues);
  const htmlBody = pickJmapBodyValue(email.htmlBody, email.bodyValues);
  const attachments = email.attachments?.length
    ? email.attachments
    : flattenJmapParts(email.bodyStructure).filter((part) => {
        const type = part.type?.toLowerCase() ?? '';
        if (!part.blobId) {
          return false;
        }
        if (type.startsWith('text/') || type.startsWith('multipart/')) {
          return false;
        }
        return true;
      });

  return {
    textBody,
    htmlBody,
    attachments: attachments
      .filter((part) => Boolean(part.blobId))
      .map((part) => ({
        blobId: part.blobId ?? '',
        name: part.name ?? null,
        type: part.type ?? null,
        size: part.size ?? null,
        disposition: part.disposition ?? null,
        cid: part.cid ?? null,
      })),
  };
};

@Injectable()
export class JmapService {
  private logger = new Logger(JmapService.name);

  constructor(
    @InjectRepository(DatasourceConnection)
    private readonly connectionRepository: Repository<DatasourceConnection>,
    @InjectRepository(EmailMessage)
    private readonly messageRepository: Repository<EmailMessage>,
    @InjectRepository(EmailLabel)
    private readonly labelRepository: Repository<EmailLabel>,
    @InjectRepository(EmailAttachment)
    private readonly attachmentRepository: Repository<EmailAttachment>,
    private readonly configService: ConfigService<AppConfigurationType>,
    private readonly jobsService: JobsService,
    private readonly contactsService: ContactsService,
  ) {}

  isJmapProvider(provider: DatasourceProvider) {
    return JMAP_PROVIDERS.includes(provider);
  }

  async connectFastmail(userId: string, startDate?: string | null) {
    const fastmailConfig = this.getFastmailConfig();
    if (!fastmailConfig?.apiKey) {
      throw new Error('Missing Fastmail API key');
    }

    const syncStartAt = parseSyncStartAt(startDate);
    const session = await this.fetchJmapSession(
      'fastmail',
      fastmailConfig.apiKey,
    );
    const accountId = this.getJmapAccountId(session);

    const existingConnection = await this.connectionRepository.findOne({
      where: {
        userId,
        provider: 'fastmail',
        providerAccountId: accountId,
      },
    });

    const connection =
      existingConnection ??
      this.connectionRepository.create({
        userId,
        provider: 'fastmail',
      });

    const syncState = (connection.syncState ?? {}) as {
      jmap?: { accountId?: string };
    };

    connection.providerAccountId = accountId;
    connection.providerEmail =
      session.username ?? connection.providerEmail ?? null;
    connection.accessToken = fastmailConfig.apiKey;
    connection.status = 'connected';
    connection.metadata = {
      ...(connection.metadata ?? {}),
      jmap: {
        username: session.username ?? null,
        apiUrl: session.apiUrl,
        downloadUrl: session.downloadUrl ?? null,
      },
    };
    connection.syncState = {
      ...syncState,
      jmap: {
        ...(syncState.jmap ?? {}),
        accountId,
      },
      syncStartAt: syncStartAt?.toISOString() ?? null,
    };

    const savedConnection = await this.connectionRepository.save(connection);

    await this.jobsService.enqueueJmapSync({
      connectionId: savedConnection.id,
      reason: 'initial',
    });

    return {
      connectionId: savedConnection.id,
    };
  }

  async syncJmapConnection(connection: DatasourceConnection) {
    if (!this.isJmapProvider(connection.provider)) {
      return { skipped: true };
    }

    if (!connection.accessToken) {
      throw new Error('Missing JMAP access token');
    }

    const session = await this.fetchJmapSession(
      connection.provider,
      connection.accessToken,
    );
    const accountId = this.getJmapAccountId(session);
    const syncStartAt = getSyncStartAt(connection);

    const syncState = (connection.syncState ?? {}) as {
      jmap?: {
        accountId?: string;
        inboxId?: string;
        queryState?: string;
      };
    };
    const jmapState = {
      ...(syncState.jmap ?? {}),
      accountId,
    };

    const inboxId =
      jmapState.inboxId ??
      (await this.getJmapInboxId(session, connection.accessToken, accountId));

    if (!inboxId) {
      this.logger.warn('JMAP inbox mailbox not found, skipping sync.');
      return { skipped: true };
    }

    jmapState.inboxId = inboxId;

    await this.syncJmapLabels(
      connection,
      session,
      connection.accessToken,
      accountId,
    );

    if (!jmapState.queryState) {
      const unreadQuery = await this.queryJmapEmails(
        session,
        connection.accessToken,
        accountId,
        inboxId,
        'unread',
      );
      await this.persistJmapMessages(
        connection,
        session,
        connection.accessToken,
        accountId,
        unreadQuery.ids,
        false,
        syncStartAt,
      );

      const seenQuery = await this.queryJmapEmails(
        session,
        connection.accessToken,
        accountId,
        inboxId,
        'seen',
      );
      await this.persistJmapMessages(
        connection,
        session,
        connection.accessToken,
        accountId,
        seenQuery.ids,
        true,
        syncStartAt,
      );

      jmapState.queryState = unreadQuery.queryState;
    } else {
      try {
        const changes = await this.queryJmapEmailChanges(
          session,
          connection.accessToken,
          accountId,
          inboxId,
          jmapState.queryState,
        );

        const addedIds =
          changes.added?.map((entry) => entry.id).filter(Boolean) ?? [];
        if (addedIds.length > 0) {
          await this.persistJmapMessages(
            connection,
            session,
            connection.accessToken,
            accountId,
            addedIds,
            false,
            syncStartAt,
          );
        }

        if (changes.removed?.length) {
          await this.messageRepository.update(
            {
              connectionId: connection.id,
              providerMessageId: In(changes.removed),
            },
            { isUnread: false },
          );
        }

        jmapState.queryState = changes.newQueryState;
      } catch (error) {
        this.logger.warn(
          `JMAP query changes failed, resetting sync state: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        const unreadQuery = await this.queryJmapEmails(
          session,
          connection.accessToken,
          accountId,
          inboxId,
          'unread',
        );
        await this.persistJmapMessages(
          connection,
          session,
          connection.accessToken,
          accountId,
          unreadQuery.ids,
          false,
          syncStartAt,
        );
        jmapState.queryState = unreadQuery.queryState;
      }
    }

    connection.syncState = {
      ...syncState,
      jmap: jmapState,
    };
    connection.lastSyncedAt = new Date();
    await this.connectionRepository.save(connection);

    return { synced: true };
  }

  private getFastmailConfig() {
    return this.configService.get<AppConfigurationType['integrations']>(
      'integrations',
    )?.fastmail;
  }

  private async fetchJmapSession(provider: DatasourceProvider, apiKey: string) {
    const sessionUrl = this.getJmapSessionUrl(provider);
    const response = await fetch(sessionUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch JMAP session: ${errorBody}`);
    }

    return (await response.json()) as JmapSession;
  }

  private getJmapSessionUrl(provider: DatasourceProvider) {
    if (provider === 'fastmail') {
      return FASTMAIL_SESSION_URL;
    }
    throw new Error(`Unsupported JMAP provider: ${provider}`);
  }

  private getJmapAccountId(session: JmapSession) {
    const primary = session.primaryAccounts?.['urn:ietf:params:jmap:mail'];
    if (primary) {
      return primary;
    }
    const accountIds = Object.keys(session.accounts ?? {});
    if (accountIds.length === 0) {
      throw new Error('No JMAP mail accounts available');
    }
    return accountIds[0];
  }

  private async jmapRequest(
    session: JmapSession,
    accessToken: string,
    methodCalls: JmapMethodCall[],
  ) {
    const response = await fetch(session.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        using: JMAP_USING,
        methodCalls,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`JMAP request failed: ${errorBody}`);
    }

    return (await response.json()) as JmapMethodResponse;
  }

  private getJmapMethodResponse<T>(
    response: JmapMethodResponse,
    method: string,
    callId: string,
  ) {
    const match = response.methodResponses.find(
      ([name, _payload, id]) => name === method && id === callId,
    );
    if (!match) {
      throw new Error(`Missing JMAP response for ${method}:${callId}`);
    }
    return match[1] as T;
  }

  private async listJmapMailboxes(
    session: JmapSession,
    accessToken: string,
    accountId: string,
  ) {
    const callId = 'mailboxGet';
    const response = await this.jmapRequest(session, accessToken, [
      [
        'Mailbox/get',
        {
          accountId,
          properties: ['id', 'name', 'role'],
        },
        callId,
      ],
    ]);

    const result = this.getJmapMethodResponse<JmapMailboxGetResponse>(
      response,
      'Mailbox/get',
      callId,
    );
    return result.list ?? [];
  }

  private async getJmapInboxId(
    session: JmapSession,
    accessToken: string,
    accountId: string,
  ) {
    const mailboxes = await this.listJmapMailboxes(
      session,
      accessToken,
      accountId,
    );
    const inbox =
      mailboxes.find((mailbox) => mailbox.role === 'inbox') ??
      mailboxes.find((mailbox) => mailbox.name.toLowerCase() === 'inbox');
    return inbox?.id ?? null;
  }

  private async queryJmapEmails(
    session: JmapSession,
    accessToken: string,
    accountId: string,
    inboxId: string,
    keywordFilter: 'unread' | 'seen' = 'unread',
  ) {
    const callId = 'emailQuery';
    const filter: Record<string, unknown> = {
      inMailbox: inboxId,
    };
    if (keywordFilter === 'unread') {
      filter.notKeyword = '$seen';
    } else if (keywordFilter === 'seen') {
      filter.hasKeyword = '$seen';
    }

    const response = await this.jmapRequest(session, accessToken, [
      [
        'Email/query',
        {
          accountId,
          filter,
          sort: [
            {
              property: 'receivedAt',
              isAscending: false,
            },
          ],
          position: 0,
          limit: JMAP_PAGE_LIMIT,
        },
        callId,
      ],
    ]);

    return this.getJmapMethodResponse<JmapEmailQueryResponse>(
      response,
      'Email/query',
      callId,
    );
  }

  private async queryJmapEmailChanges(
    session: JmapSession,
    accessToken: string,
    accountId: string,
    inboxId: string,
    queryState: string,
  ) {
    const callId = 'emailQueryChanges';
    const response = await this.jmapRequest(session, accessToken, [
      [
        'Email/queryChanges',
        {
          accountId,
          filter: {
            inMailbox: inboxId,
            notKeyword: '$seen',
          },
          sinceQueryState: queryState,
          maxChanges: JMAP_PAGE_LIMIT,
        },
        callId,
      ],
    ]);

    return this.getJmapMethodResponse<JmapEmailQueryChangesResponse>(
      response,
      'Email/queryChanges',
      callId,
    );
  }

  private async getJmapEmails(
    session: JmapSession,
    accessToken: string,
    accountId: string,
    ids: string[],
  ) {
    if (ids.length === 0) {
      return [];
    }

    const callId = 'emailGet';
    const response = await this.jmapRequest(session, accessToken, [
      [
        'Email/get',
        {
          accountId,
          ids,
          properties: [
            'id',
            'threadId',
            'mailboxIds',
            'subject',
            'preview',
            'receivedAt',
            'sentAt',
            'from',
            'to',
            'cc',
            'bcc',
            'replyTo',
            'messageId',
            'keywords',
            'bodyStructure',
            'bodyValues',
            'textBody',
            'htmlBody',
            'attachments',
          ],
          bodyProperties: [
            'partId',
            'blobId',
            'size',
            'type',
            'name',
            'charset',
            'disposition',
            'cid',
          ],
        },
        callId,
      ],
    ]);

    const result = this.getJmapMethodResponse<JmapEmailGetResponse>(
      response,
      'Email/get',
      callId,
    );
    return result.list ?? [];
  }

  private async syncJmapLabels(
    connection: DatasourceConnection,
    session: JmapSession,
    accessToken: string,
    accountId: string,
  ) {
    const mailboxes = await this.listJmapMailboxes(
      session,
      accessToken,
      accountId,
    );
    if (mailboxes.length === 0) {
      return;
    }

    const entries = mailboxes.map((mailbox) => ({
      connectionId: connection.id,
      providerLabelId: mailbox.id,
      name: mailbox.name,
      type: mailbox.role ?? null,
      backgroundColor: null,
      textColor: null,
    }));

    await this.labelRepository.upsert(entries, [
      'connectionId',
      'providerLabelId',
    ]);
  }

  private async persistJmapMessages(
    connection: DatasourceConnection,
    session: JmapSession,
    accessToken: string,
    accountId: string,
    messageIds: string[],
    includeRead = false,
    syncStartAt: Date | null = null,
  ) {
    const uniqueIds = Array.from(new Set(messageIds));
    for (let i = 0; i < uniqueIds.length; i += JMAP_PAGE_LIMIT) {
      const batch = uniqueIds.slice(i, i + JMAP_PAGE_LIMIT);
      const emails = await this.getJmapEmails(
        session,
        accessToken,
        accountId,
        batch,
      );
      for (const email of emails) {
        await this.persistJmapMessage(
          connection,
          session,
          accessToken,
          accountId,
          email,
          includeRead,
          syncStartAt,
        );
      }
    }
  }

  private async persistJmapMessage(
    connection: DatasourceConnection,
    session: JmapSession,
    accessToken: string,
    accountId: string,
    email: JmapEmail,
    includeRead: boolean,
    syncStartAt: Date | null,
  ) {
    const subject = email.subject ?? null;
    const messageIdHeader = email.messageId?.[0] ?? null;
    const from = normalizeJmapAddresses(email.from);
    const to = normalizeJmapAddresses(email.to);
    const cc = normalizeJmapAddresses(email.cc);
    const bcc = normalizeJmapAddresses(email.bcc);
    const replyTo = normalizeJmapAddresses(email.replyTo);
    const receivedAt = email.receivedAt ?? email.sentAt ?? null;
    const sentAt = receivedAt ? new Date(receivedAt) : null;
    const mailboxIds = Object.keys(email.mailboxIds ?? {});
    const content = buildJmapContent(email);
    if (syncStartAt && sentAt && sentAt < syncStartAt) {
      return;
    }

    await this.contactsService.upsertContacts(
      connection.userId,
      buildContactEntries(
        [from, to, cc, bcc, replyTo].flat(),
        sentAt ?? new Date(),
      ),
    );

    const isUnread = !email.keywords?.$seen;

    if (!isUnread && !includeRead) {
      return;
    }

    await this.messageRepository.manager.transaction(async (manager) => {
      const threadRepository = manager.getRepository(EmailThread);
      const messageRepository = manager.getRepository(EmailMessage);
      const participantRepository = manager.getRepository(EmailParticipant);
      const messageLabelRepository = manager.getRepository(EmailMessageLabel);
      const attachmentRepository = manager.getRepository(EmailAttachment);
      const labelRepository = manager.getRepository(EmailLabel);

      let thread = await threadRepository.findOne({
        where: {
          connectionId: connection.id,
          providerThreadId: email.threadId,
        },
      });

      if (!thread) {
        thread = threadRepository.create({
          connectionId: connection.id,
          providerThreadId: email.threadId,
        });
      }

      thread.subject = subject ?? thread.subject ?? null;
      thread.snippet = email.preview ?? thread.snippet ?? null;
      thread.lastMessageAt = sentAt ?? thread.lastMessageAt;

      thread = await threadRepository.save(thread);

      let storedMessage = await messageRepository.findOne({
        where: {
          connectionId: connection.id,
          providerMessageId: email.id,
        },
      });

      if (!storedMessage) {
        storedMessage = messageRepository.create({
          connectionId: connection.id,
          providerMessageId: email.id,
        });
      }

      storedMessage.threadId = thread.id;
      storedMessage.subject = subject;
      storedMessage.messageId = messageIdHeader;
      storedMessage.snippet = email.preview ?? null;
      storedMessage.textBody = content.textBody ?? null;
      storedMessage.htmlBody = content.htmlBody ?? null;
      storedMessage.sentAt = sentAt;
      storedMessage.isUnread = isUnread;
      storedMessage.metadata = {
        ...(storedMessage.metadata ?? {}),
        mailboxIds,
      };

      storedMessage = await messageRepository.save(storedMessage);

      await participantRepository.delete({ messageId: storedMessage.id });

      const participants = [
        ...from.map((entry) => ({ ...entry, role: 'from' as const })),
        ...to.map((entry) => ({ ...entry, role: 'to' as const })),
        ...cc.map((entry) => ({ ...entry, role: 'cc' as const })),
        ...bcc.map((entry) => ({ ...entry, role: 'bcc' as const })),
        ...replyTo.map((entry) => ({ ...entry, role: 'reply-to' as const })),
      ].map((entry) =>
        participantRepository.create({
          messageId: storedMessage.id,
          email: entry.email,
          name: entry.name,
          role: entry.role,
        }),
      );

      if (participants.length > 0) {
        await participantRepository.save(participants);
      }

      await messageLabelRepository.delete({ messageId: storedMessage.id });

      if (mailboxIds.length > 0) {
        const labels = await labelRepository.find({
          where: {
            connectionId: connection.id,
            providerLabelId: In(mailboxIds),
          },
        });

        const labelById = new Map(
          labels.map((label) => [label.providerLabelId, label]),
        );

        const messageLabels = mailboxIds
          .map((mailboxId) => labelById.get(mailboxId))
          .filter((label): label is EmailLabel => Boolean(label))
          .map((label) =>
            messageLabelRepository.create({
              messageId: storedMessage.id,
              labelId: label.id,
            }),
          );

        if (messageLabels.length > 0) {
          await messageLabelRepository.save(messageLabels);
        }
      }

      const existingAttachments = await attachmentRepository.find({
        where: { messageId: storedMessage.id },
      });

      if (existingAttachments.length > 0) {
        await attachmentRepository.delete({ messageId: storedMessage.id });
      }

      const attachments = await this.buildJmapAttachmentEntities(
        session,
        accessToken,
        accountId,
        content.attachments,
        storedMessage.id,
      );

      let savedAttachments: EmailAttachment[] = [];
      if (attachments.length > 0) {
        savedAttachments = await attachmentRepository.save(attachments);
      }

      const unreadCount = await messageRepository.count({
        where: {
          threadId: thread.id,
          isUnread: true,
        },
      });

      const messageCount = await messageRepository.count({
        where: {
          threadId: thread.id,
        },
      });

      thread.unreadCount = unreadCount;
      thread.messageCount = messageCount;
      await threadRepository.save(thread);

      if (!storedMessage.llmProcessed && isUnread) {
        await this.jobsService.enqueueLlmAnalysis({
          type: 'email',
          userId: connection.userId,
          messageId: storedMessage.id,
          threadId: thread.id,
        });
      }

      for (const attachment of savedAttachments) {
        if (!attachment.llmProcessed && isUnread) {
          await this.jobsService.enqueueLlmAnalysis({
            type: 'attachment',
            userId: connection.userId,
            attachmentId: attachment.id,
          });
        }
      }
    });
  }

  private async buildJmapAttachmentEntities(
    session: JmapSession,
    accessToken: string,
    accountId: string,
    attachments: JmapAttachment[],
    storedMessageId: string,
  ) {
    const entities: EmailAttachment[] = [];

    for (const attachment of attachments) {
      let content: Buffer | null = null;
      try {
        content = await this.downloadJmapAttachment(
          session,
          accessToken,
          accountId,
          attachment,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to download JMAP attachment ${attachment.blobId}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      const isInline =
        attachment.disposition?.toLowerCase() === 'inline' ||
        Boolean(attachment.cid);

      entities.push(
        this.attachmentRepository.create({
          messageId: storedMessageId,
          providerAttachmentId: attachment.blobId,
          filename: attachment.name ?? null,
          mimeType: attachment.type ?? null,
          size: attachment.size ?? null,
          isInline,
          contentId: attachment.cid ?? null,
          content,
        }),
      );
    }

    return entities;
  }

  private buildJmapDownloadUrl(
    template: string,
    params: {
      accountId: string;
      blobId: string;
      name?: string | null;
      type?: string | null;
    },
  ) {
    const name = params.name ?? 'attachment';
    const type = params.type ?? 'application/octet-stream';
    return template
      .replace('{accountId}', encodeURIComponent(params.accountId))
      .replace('{blobId}', encodeURIComponent(params.blobId))
      .replace('{name}', encodeURIComponent(name))
      .replace('{type}', encodeURIComponent(type));
  }

  private async downloadJmapAttachment(
    session: JmapSession,
    accessToken: string,
    accountId: string,
    attachment: JmapAttachment,
  ) {
    if (!session.downloadUrl) {
      return null;
    }

    const url = this.buildJmapDownloadUrl(session.downloadUrl, {
      accountId,
      blobId: attachment.blobId,
      name: attachment.name ?? undefined,
      type: attachment.type ?? undefined,
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch JMAP blob: ${errorBody}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }
}
