import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { type AppConfigurationType } from '@server/config/configuration';
import { ContactsService } from '@server/contacts/contacts.service';
import { JobsService } from '@server/jobs/jobs.service';
import { EmailAnalysis } from '@server/llm/email-analysis.entity';
import { ThreadAnalysis } from '@server/llm/thread-analysis.entity';
import { In, Repository } from 'typeorm';
import {
  DatasourceConnection,
  type DatasourceProvider,
} from './datasource-connection.entity';
import { DatasourceOauthState } from './datasource-oauth-state.entity';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLabel } from './email-label.entity';
import { EmailMessage } from './email-message.entity';
import { EmailMessageLabel } from './email-message-label.entity';
import { EmailParticipant } from './email-participant.entity';
import { EmailThread } from './email-thread.entity';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  // 'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
].join(' ');

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FASTMAIL_SESSION_URL = 'https://api.fastmail.com/.well-known/jmap';
const JMAP_USING = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'];
const JMAP_PAGE_LIMIT = 50;
const JMAP_PROVIDERS: DatasourceProvider[] = ['fastmail'];
const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
};

type GmailTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
  id_token?: string;
};

type GmailProfile = {
  emailAddress: string;
  historyId: string;
  messagesTotal: number;
  threadsTotal: number;
};

type GmailLabel = {
  id: string;
  name: string;
  type?: string;
  color?: {
    backgroundColor?: string;
    textColor?: string;
  };
};

type GmailHeader = {
  name: string;
  value: string;
};

type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

type GmailHistoryRecord = {
  id: string;
  messagesAdded?: { message: GmailMessage }[];
  labelsAdded?: { message: GmailMessage; labelIds?: string[] }[];
  labelsRemoved?: { message: GmailMessage; labelIds?: string[] }[];
};

type GmailHistoryResponse = {
  history?: GmailHistoryRecord[];
  historyId?: string;
  nextPageToken?: string;
};

type GmailListResponse = {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
};

type GmailAttachmentResponse = {
  data?: string;
  size?: number;
};

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

type ExtractedAttachment = {
  attachmentId?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  contentId?: string | null;
  isInline: boolean;
  inlineData?: Buffer | null;
};

type ExtractedContent = {
  textBody?: string | null;
  htmlBody?: string | null;
  attachments: ExtractedAttachment[];
};

type ParsedAddress = {
  name: string | null;
  email: string;
};

const getHeaderValue = (headers: GmailHeader[] | undefined, name: string) => {
  if (!headers) {
    return undefined;
  }
  const header = headers.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value;
};

const parseAddressList = (value?: string): ParsedAddress[] => {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?$/);
      if (match) {
        return {
          name: match[1]?.trim() || null,
          email: match[2],
        };
      }
      return { name: null, email: part };
    });
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

const extractContentFromPart = (
  part: GmailMessagePart,
  result: ExtractedContent,
) => {
  if (part.parts && part.parts.length > 0) {
    for (const child of part.parts) {
      extractContentFromPart(child, result);
    }
    return;
  }

  const mimeType = part.mimeType ?? '';
  const bodyData = part.body?.data
    ? decodeBase64Url(part.body.data).toString('utf-8')
    : null;

  if (mimeType === 'text/plain' && bodyData && !result.textBody) {
    result.textBody = bodyData;
  }

  if (mimeType === 'text/html' && bodyData && !result.htmlBody) {
    result.htmlBody = bodyData;
  }

  const contentId = getHeaderValue(part.headers, 'Content-ID');
  const contentDisposition = getHeaderValue(
    part.headers,
    'Content-Disposition',
  );
  const isInline = Boolean(
    contentDisposition?.toLowerCase().includes('inline') || contentId,
  );

  const isAttachmentCandidate =
    Boolean(part.body?.attachmentId || part.filename) ||
    (Boolean(mimeType) && !mimeType.startsWith('text/'));

  if (isAttachmentCandidate) {
    const inlineBuffer =
      !part.body?.attachmentId && part.body?.data
        ? decodeBase64Url(part.body.data)
        : null;
    result.attachments.push({
      attachmentId: part.body?.attachmentId,
      filename: part.filename ?? undefined,
      mimeType: mimeType || undefined,
      size: part.body?.size,
      contentId: contentId?.replace(/[<>]/g, '') ?? null,
      isInline,
      inlineData: inlineBuffer,
    });
  }
};

const buildExtractedContent = (
  payload?: GmailMessagePart,
): ExtractedContent => {
  const result: ExtractedContent = {
    textBody: null,
    htmlBody: null,
    attachments: [],
  };

  if (!payload) {
    return result;
  }

  extractContentFromPart(payload, result);

  if (!result.textBody && payload.body?.data) {
    result.textBody = decodeBase64Url(payload.body.data).toString('utf-8');
  }

  return result;
};

@Injectable()
export class DatasourcesService {
  private logger = new Logger(DatasourcesService.name);

  constructor(
    @InjectRepository(DatasourceConnection)
    private readonly connectionRepository: Repository<DatasourceConnection>,
    @InjectRepository(DatasourceOauthState)
    private readonly oauthStateRepository: Repository<DatasourceOauthState>,
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
    private readonly configService: ConfigService<AppConfigurationType>,
    private readonly jobsService: JobsService,
    private readonly contactsService: ContactsService,
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
      await this.jobsService.enqueueEmailSync({
        connectionId: connection.id,
        reason: 'manual',
      });
    } else if (this.isJmapProvider(connection.provider)) {
      await this.jobsService.enqueueJmapSync({
        connectionId: connection.id,
        reason: 'manual',
      });
    }

    return { queued: true };
  }

  async connectFastmail(userId: string, startDate?: string | null) {
    const fastmailConfig = this.getFastmailConfig();
    if (!fastmailConfig?.apiKey) {
      throw new Error('Missing Fastmail API key');
    }

    const syncStartAt = this.parseSyncStartAt(startDate);
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

  async createGmailAuthUrl(
    userId: string,
    redirectTo?: string | null,
    startDate?: string | null,
  ) {
    const gmailConfig = this.getGmailConfig();

    if (!gmailConfig?.clientId || !gmailConfig?.clientSecret) {
      throw new Error('Missing Gmail OAuth configuration');
    }

    const state = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const syncStartAt = this.parseSyncStartAt(startDate);

    await this.oauthStateRepository.save({
      userId,
      provider: 'gmail',
      state,
      redirectTo: redirectTo ?? null,
      expiresAt,
      syncStartAt,
    });

    const params = new URLSearchParams({
      client_id: gmailConfig.clientId,
      redirect_uri: gmailConfig.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GMAIL_SCOPES,
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }

  async handleGmailCallback(code: string, state: string) {
    const oauthState = await this.oauthStateRepository.findOne({
      where: { state, provider: 'gmail' },
    });

    if (!oauthState || oauthState.expiresAt.getTime() < Date.now()) {
      throw new Error('OAuth state expired or invalid');
    }

    const gmailConfig = this.getGmailConfig();

    if (!gmailConfig?.clientId || !gmailConfig?.clientSecret) {
      throw new Error('Missing Gmail OAuth configuration');
    }

    const tokenResponse = await this.exchangeGmailCode({
      code,
      clientId: gmailConfig.clientId,
      clientSecret: gmailConfig.clientSecret,
      redirectUri: gmailConfig.redirectUri,
    });

    const profile = await this.getGmailProfile(tokenResponse.access_token);

    const existingConnection = await this.connectionRepository.findOne({
      where: {
        userId: oauthState.userId,
        provider: 'gmail',
        providerEmail: profile.emailAddress,
      },
    });

    const now = Date.now();

    const connection =
      existingConnection ??
      this.connectionRepository.create({
        userId: oauthState.userId,
        provider: 'gmail',
      });

    connection.providerAccountId = profile.emailAddress;
    connection.providerEmail = profile.emailAddress;
    connection.accessToken = tokenResponse.access_token;
    connection.refreshToken =
      tokenResponse.refresh_token ?? connection.refreshToken ?? null;
    connection.accessTokenExpiresAt = new Date(
      now + tokenResponse.expires_in * 1000,
    );
    connection.scope = tokenResponse.scope ?? connection.scope ?? null;
    connection.status = 'connected';

    connection.metadata = {
      ...(connection.metadata ?? {}),
      gmail: {
        profile,
      },
    };

    connection.syncState = {
      ...(connection.syncState ?? {}),
      historyId: profile.historyId,
      initialSyncCompleted: false,
      syncStartAt: oauthState.syncStartAt
        ? oauthState.syncStartAt.toISOString()
        : null,
    };

    const savedConnection = await this.connectionRepository.save(connection);

    const watchResponse = await this.watchGmailMailbox(
      tokenResponse.access_token,
      gmailConfig.pubsubTopic,
    );

    savedConnection.syncState = {
      ...(savedConnection.syncState ?? {}),
      historyId: watchResponse.historyId ?? profile.historyId,
      watchExpiration: watchResponse.expiration ?? null,
      initialSyncCompleted: false,
    };

    await this.connectionRepository.save(savedConnection);

    await this.oauthStateRepository.delete({ id: oauthState.id });

    await this.jobsService.enqueueEmailSync({
      connectionId: savedConnection.id,
      reason: 'initial',
    });

    return {
      connectionId: savedConnection.id,
      redirectTo: oauthState.redirectTo,
    };
  }

  async handleGmailPushNotification(payload: { message?: { data?: string } }) {
    const data = payload.message?.data;
    if (!data) {
      return { skipped: true };
    }

    const decoded = decodeBase64Url(data).toString('utf-8');
    let parsed: { emailAddress?: string; historyId?: string } | null = null;

    try {
      parsed = JSON.parse(decoded);
    } catch (_error) {
      this.logger.warn(`Invalid Gmail push payload: ${decoded}`);
      return { skipped: true };
    }

    if (!parsed?.emailAddress) {
      return { skipped: true };
    }

    const connection = await this.connectionRepository.findOne({
      where: {
        provider: 'gmail',
        providerEmail: parsed.emailAddress,
      },
    });

    if (!connection) {
      return { skipped: true };
    }

    await this.jobsService.enqueueEmailSync({
      connectionId: connection.id,
      triggerHistoryId: parsed.historyId,
      reason: 'push',
    });

    return { queued: true };
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
      return this.syncGmailMailbox(connection, payload.triggerHistoryId);
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
    const syncStartAt = this.getSyncStartAt(connection);

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

  private getGmailConfig() {
    return this.configService.get<AppConfigurationType['integrations']>(
      'integrations',
    )?.gmail;
  }

  private parseSyncStartAt(value?: string | null) {
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const now = new Date();
    const startAt = new Date(now);
    startAt.setMonth(startAt.getMonth() - 1);
    return startAt;
  }

  private getSyncStartAt(connection: DatasourceConnection) {
    const syncState = (connection.syncState ?? {}) as {
      syncStartAt?: string | null;
    };
    if (!syncState.syncStartAt) {
      return null;
    }
    const parsed = new Date(syncState.syncStartAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private buildGmailAfterQuery(startAt: Date) {
    const timestamp = Math.floor(startAt.getTime() / 1000);
    return `after:${timestamp}`;
  }

  private buildContactEntries(entries: ParsedAddress[], firstMetAt: Date) {
    const byEmail = new Map<
      string,
      { email: string; name: string | null; firstMetAt: Date }
    >();

    for (const entry of entries) {
      const email = entry.email.trim().toLowerCase();
      if (!email) {
        continue;
      }
      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, {
          email,
          name: entry.name ?? null,
          firstMetAt,
        });
        continue;
      }
      if (!existing.name && entry.name) {
        existing.name = entry.name;
      }
    }

    return Array.from(byEmail.values());
  }

  private getFastmailConfig() {
    return this.configService.get<AppConfigurationType['integrations']>(
      'integrations',
    )?.fastmail;
  }

  private isJmapProvider(provider: DatasourceProvider) {
    return JMAP_PROVIDERS.includes(provider);
  }

  private async exchangeGmailCode(input: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<GmailTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to exchange Gmail code: ${errorBody}`);
    }

    return (await response.json()) as GmailTokenResponse;
  }

  private async refreshGmailToken(connection: DatasourceConnection) {
    const gmailConfig = this.getGmailConfig();

    if (!gmailConfig?.clientId || !gmailConfig?.clientSecret) {
      throw new Error('Missing Gmail OAuth configuration');
    }

    if (!connection.refreshToken) {
      throw new Error('Missing Gmail refresh token');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: gmailConfig.clientId,
        client_secret: gmailConfig.clientSecret,
        refresh_token: connection.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to refresh Gmail token: ${errorBody}`);
    }

    const data = (await response.json()) as GmailTokenResponse;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    connection.accessToken = data.access_token;
    connection.accessTokenExpiresAt = expiresAt;
    connection.scope = data.scope ?? connection.scope ?? null;

    await this.connectionRepository.save(connection);

    return data.access_token;
  }

  private async getValidAccessToken(connection: DatasourceConnection) {
    const token = connection.accessToken;
    if (!token) {
      return this.refreshGmailToken(connection);
    }

    if (!connection.accessTokenExpiresAt) {
      return token;
    }

    const expiresAt = connection.accessTokenExpiresAt.getTime();
    if (expiresAt - Date.now() < 60 * 1000) {
      return this.refreshGmailToken(connection);
    }

    return token;
  }

  private async gmailRequest<T>(
    accessToken: string,
    path: string,
    init?: RequestInit,
  ) {
    console.log('gmailRequest', `${GMAIL_API_BASE}${path}`);
    const response = await fetch(`${GMAIL_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gmail API error: ${errorBody}`);
    }

    return (await response.json()) as T;
  }

  private async getGmailProfile(accessToken: string) {
    return this.gmailRequest<GmailProfile>(accessToken, '/profile');
  }

  private async watchGmailMailbox(accessToken: string, topicName?: string) {
    if (!topicName) {
      this.logger.warn('Missing Gmail Pub/Sub topic name');
      return { historyId: undefined, expiration: undefined };
    }

    return this.gmailRequest<{ historyId?: string; expiration?: string }>(
      accessToken,
      '/watch',
      {
        method: 'POST',
        body: JSON.stringify({
          topicName,
          labelIds: ['INBOX'],
        }),
      },
    );
  }

  private async listGmailLabels(accessToken: string) {
    const response = await this.gmailRequest<{ labels?: GmailLabel[] }>(
      accessToken,
      '/labels',
    );

    return response.labels ?? [];
  }

  private async listGmailMessages(
    accessToken: string,
    options: {
      query?: string;
      pageToken?: string;
      labelIds?: string[];
    } = {},
  ) {
    const params = new URLSearchParams({
      maxResults: '50',
      format: 'full',
    });

    if (options.query) {
      params.set('q', options.query);
    }

    if (options.labelIds && options.labelIds.length > 0) {
      for (const labelId of options.labelIds) {
        params.append('labelIds', labelId);
      }
    }

    if (options.pageToken) {
      params.set('pageToken', options.pageToken);
    }

    return this.gmailRequest<GmailListResponse>(
      accessToken,
      `/messages?${params.toString()}`,
    );
  }

  private async getGmailMessage(
    accessToken: string,
    messageId: string,
    format: 'full' | 'metadata' = 'full',
  ) {
    const params = new URLSearchParams({
      format,
    });

    return this.gmailRequest<GmailMessage>(
      accessToken,
      `/messages/${messageId}?${params.toString()}`,
    );
  }

  private async getGmailAttachment(
    accessToken: string,
    messageId: string,
    attachmentId: string,
  ) {
    return this.gmailRequest<GmailAttachmentResponse>(
      accessToken,
      `/messages/${messageId}/attachments/${attachmentId}`,
    );
  }

  private async listGmailHistory(
    accessToken: string,
    startHistoryId: string,
    pageToken?: string,
  ) {
    const params = new URLSearchParams({
      startHistoryId,
      labelId: 'INBOX',
    });
    params.append('historyTypes', 'messageAdded');
    params.append('historyTypes', 'labelAdded');
    params.append('historyTypes', 'labelRemoved');

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    return this.gmailRequest<GmailHistoryResponse>(
      accessToken,
      `/history?${params.toString()}`,
    );
  }

  private async syncGmailMailbox(
    connection: DatasourceConnection,
    triggerHistoryId?: string,
  ) {
    const accessToken = await this.getValidAccessToken(connection);
    const hasReadonlyScope = await this.ensureReadonlyScope(
      connection,
      accessToken,
    );
    const syncStartAt = this.getSyncStartAt(connection);

    await this.syncGmailLabels(connection, accessToken);

    const syncState = (connection.syncState ?? {}) as {
      historyId?: string;
      initialSyncCompleted?: boolean;
    };

    if (!syncState.initialSyncCompleted) {
      await this.initialUnreadSync(
        connection,
        accessToken,
        hasReadonlyScope,
        syncStartAt,
      );
      syncState.initialSyncCompleted = true;
    }

    const startHistoryId = syncState.historyId;
    let latestHistoryId: string | undefined;

    if (startHistoryId) {
      latestHistoryId = await this.applyHistoryDelta(
        connection,
        accessToken,
        hasReadonlyScope,
        startHistoryId,
        syncStartAt,
      );
    }

    syncState.historyId = this.pickLatestHistoryId([
      syncState.historyId,
      latestHistoryId,
      triggerHistoryId,
    ]);

    connection.syncState = syncState as Record<string, unknown>;
    connection.lastSyncedAt = new Date();
    await this.connectionRepository.save(connection);

    return { synced: true };
  }

  private async initialUnreadSync(
    connection: DatasourceConnection,
    accessToken: string,
    hasReadonlyScope: boolean,
    syncStartAt: Date | null,
  ) {
    let pageToken: string | undefined;
    let batchCount = 0;

    do {
      const query = syncStartAt
        ? this.buildGmailAfterQuery(syncStartAt)
        : undefined;
      const response = await this.listGmailMessages(accessToken, {
        labelIds: ['UNREAD'],
        query,
        pageToken,
      });

      const messages = response.messages ?? [];
      for (const message of messages) {
        await this.persistGmailMessage(
          connection,
          accessToken,
          message.id,
          hasReadonlyScope,
          syncStartAt,
        );
      }

      pageToken = response.nextPageToken;
      batchCount += 1;
    } while (pageToken && batchCount < 10);
  }

  private async applyHistoryDelta(
    connection: DatasourceConnection,
    accessToken: string,
    hasReadonlyScope: boolean,
    startHistoryId: string,
    syncStartAt: Date | null,
  ) {
    let pageToken: string | undefined;
    let latestHistoryId = startHistoryId;

    do {
      const response = await this.listGmailHistory(
        accessToken,
        startHistoryId,
        pageToken,
      );

      if (response.historyId) {
        latestHistoryId = response.historyId;
      }

      const historyEntries = response.history ?? [];
      for (const entry of historyEntries) {
        if (entry.messagesAdded) {
          for (const record of entry.messagesAdded) {
            const messageId = record.message.id;
            await this.persistGmailMessage(
              connection,
              accessToken,
              messageId,
              hasReadonlyScope,
              syncStartAt,
            );
          }
        }

        if (entry.labelsAdded) {
          for (const record of entry.labelsAdded) {
            if (record.labelIds?.includes('UNREAD')) {
              await this.persistGmailMessage(
                connection,
                accessToken,
                record.message.id,
                hasReadonlyScope,
                syncStartAt,
              );
            }
          }
        }

        if (entry.labelsRemoved) {
          for (const record of entry.labelsRemoved) {
            if (record.labelIds?.includes('UNREAD')) {
              await this.messageRepository.update(
                {
                  connectionId: connection.id,
                  providerMessageId: record.message.id,
                },
                {
                  isUnread: false,
                },
              );
            }
          }
        }
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    return latestHistoryId;
  }

  private async persistGmailMessage(
    connection: DatasourceConnection,
    accessToken: string,
    messageId: string,
    hasReadonlyScope: boolean,
    syncStartAt: Date | null,
  ) {
    const message = await this.getGmailMessage(
      accessToken,
      messageId,
      hasReadonlyScope ? 'full' : 'metadata',
    );
    const isUnread = message.labelIds?.includes('UNREAD') ?? false;

    const payload = message.payload;
    const headers = payload?.headers ?? [];

    const subject = getHeaderValue(headers, 'Subject') ?? null;
    const messageIdHeader = getHeaderValue(headers, 'Message-ID') ?? null;
    const from = parseAddressList(getHeaderValue(headers, 'From'));
    const to = parseAddressList(getHeaderValue(headers, 'To'));
    const cc = parseAddressList(getHeaderValue(headers, 'Cc'));
    const bcc = parseAddressList(getHeaderValue(headers, 'Bcc'));
    const replyTo = parseAddressList(getHeaderValue(headers, 'Reply-To'));
    const messageSentAt = message.internalDate
      ? new Date(Number(message.internalDate))
      : null;

    if (syncStartAt && messageSentAt && messageSentAt < syncStartAt) {
      return;
    }

    await this.contactsService.upsertContacts(
      connection.userId,
      this.buildContactEntries(
        [from, to, cc, bcc, replyTo].flat(),
        messageSentAt ?? new Date(),
      ),
    );

    // if (!isUnread) {
    //   return;
    // }

    const content = hasReadonlyScope
      ? buildExtractedContent(payload)
      : { textBody: null, htmlBody: null, attachments: [] };

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
          providerThreadId: message.threadId,
        },
      });

      if (!thread) {
        thread = threadRepository.create({
          connectionId: connection.id,
          providerThreadId: message.threadId,
        });
      }

      thread.subject = subject ?? thread.subject ?? null;
      thread.snippet = message.snippet ?? thread.snippet ?? null;
      thread.lastMessageAt = message.internalDate
        ? new Date(Number(message.internalDate))
        : thread.lastMessageAt;

      thread = await threadRepository.save(thread);

      let storedMessage = await messageRepository.findOne({
        where: {
          connectionId: connection.id,
          providerMessageId: message.id,
        },
      });

      if (!storedMessage) {
        storedMessage = messageRepository.create({
          connectionId: connection.id,
          providerMessageId: message.id,
        });
      }

      storedMessage.threadId = thread.id;
      storedMessage.subject = subject;
      storedMessage.messageId = messageIdHeader;
      storedMessage.snippet = message.snippet ?? null;
      storedMessage.textBody = content.textBody ?? null;
      storedMessage.htmlBody = content.htmlBody ?? null;
      storedMessage.sentAt = messageSentAt;
      storedMessage.isUnread = isUnread;
      storedMessage.metadata = {
        ...(storedMessage.metadata ?? {}),
        labelIds: message.labelIds ?? [],
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

      const labelIds = message.labelIds ?? [];
      if (labelIds.length > 0) {
        const labels = await labelRepository.find({
          where: {
            connectionId: connection.id,
            providerLabelId: In(labelIds),
          },
        });

        const labelById = new Map(
          labels.map((label) => [label.providerLabelId, label]),
        );

        const messageLabels = labelIds
          .map((labelId) => labelById.get(labelId))
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

      let savedAttachments: EmailAttachment[] = [];
      if (hasReadonlyScope) {
        const attachments = await this.buildAttachmentEntities(
          accessToken,
          message,
          content.attachments,
          storedMessage.id,
        );

        if (attachments.length > 0) {
          savedAttachments = await attachmentRepository.save(attachments);
        }
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

      if (!storedMessage.llmProcessed) {
        await this.jobsService.enqueueLlmAnalysis({
          type: 'email',
          userId: connection.userId,
          messageId: storedMessage.id,
          threadId: thread.id,
        });
      }

      for (const attachment of savedAttachments) {
        if (!attachment.llmProcessed) {
          await this.jobsService.enqueueLlmAnalysis({
            type: 'attachment',
            userId: connection.userId,
            attachmentId: attachment.id,
          });
        }
      }
    });
  }

  private async buildAttachmentEntities(
    accessToken: string,
    message: GmailMessage,
    attachments: ExtractedAttachment[],
    storedMessageId: string,
  ) {
    const entities: EmailAttachment[] = [];

    for (const attachment of attachments) {
      let content = attachment.inlineData ?? null;

      if (!content && attachment.attachmentId) {
        const response = await this.getGmailAttachment(
          accessToken,
          message.id,
          attachment.attachmentId,
        );
        if (response.data) {
          content = decodeBase64Url(response.data);
        }
      }

      entities.push(
        this.attachmentRepository.create({
          messageId: storedMessageId,
          providerAttachmentId: attachment.attachmentId ?? null,
          filename: attachment.filename ?? null,
          mimeType: attachment.mimeType ?? null,
          size: attachment.size ?? null,
          isInline: attachment.isInline,
          contentId: attachment.contentId ?? null,
          content,
        }),
      );
    }

    return entities;
  }

  private async syncGmailLabels(
    connection: DatasourceConnection,
    accessToken: string,
  ) {
    const labels = await this.listGmailLabels(accessToken);
    if (labels.length === 0) {
      return;
    }

    const entries = labels.map((label) => ({
      connectionId: connection.id,
      providerLabelId: label.id,
      name: label.name,
      type: label.type ?? null,
      backgroundColor: label.color?.backgroundColor ?? null,
      textColor: label.color?.textColor ?? null,
    }));

    await this.labelRepository.upsert(entries, [
      'connectionId',
      'providerLabelId',
    ]);
  }

  private async ensureReadonlyScope(
    connection: DatasourceConnection,
    accessToken: string,
  ) {
    const scope = await this.fetchGoogleTokenScope(accessToken);

    if (scope && scope !== connection.scope) {
      connection.scope = scope;
      await this.connectionRepository.save(connection);
    }

    if (scope?.includes('gmail.readonly')) {
      return true;
    }

    connection.status = 'error';
    connection.metadata = {
      ...(connection.metadata ?? {}),
      scopeError: 'missing_gmail_readonly',
      scope,
    };
    await this.connectionRepository.save(connection);

    this.logger.warn(
      'Gmail connection missing readonly scope. Reconnect to grant access.',
    );
    return false;
  }

  private async fetchGoogleTokenScope(accessToken: string) {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(
        accessToken,
      )}`,
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch Google token info: ${body}`);
    }

    const data = (await response.json()) as { scope?: string };
    return data.scope ?? null;
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
      this.buildContactEntries(
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
      storedMessage.textBody = content.textBody;
      storedMessage.htmlBody = content.htmlBody;
      storedMessage.sentAt = sentAt;
      storedMessage.isUnread = isUnread;
      storedMessage.metadata = {
        ...(storedMessage.metadata ?? {}),
        mailboxIds,
        keywords: email.keywords ?? {},
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
          .map((labelId) => labelById.get(labelId))
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

      let savedAttachments: EmailAttachment[] = [];
      if (content.attachments.length > 0) {
        const attachments = await this.buildJmapAttachmentEntities(
          session,
          accessToken,
          accountId,
          content.attachments,
          storedMessage.id,
        );

        if (attachments.length > 0) {
          savedAttachments = await attachmentRepository.save(attachments);
        }
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

      if (isUnread && !storedMessage.llmProcessed) {
        await this.jobsService.enqueueLlmAnalysis({
          type: 'email',
          userId: connection.userId,
          messageId: storedMessage.id,
          threadId: thread.id,
        });
      }

      if (isUnread) {
        for (const attachment of savedAttachments) {
          if (!attachment.llmProcessed) {
            await this.jobsService.enqueueLlmAnalysis({
              type: 'attachment',
              userId: connection.userId,
              attachmentId: attachment.id,
            });
          }
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

  private pickLatestHistoryId(historyIds: Array<string | undefined>) {
    const filtered = historyIds.filter((value): value is string =>
      Boolean(value),
    );
    if (filtered.length === 0) {
      return undefined;
    }

    return filtered.reduce((latest, current) => {
      try {
        return BigInt(current) > BigInt(latest) ? current : latest;
      } catch {
        return latest;
      }
    });
  }
}
