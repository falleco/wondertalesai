import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { type AppConfigurationType } from '@server/config/configuration';
import { JobsService } from '@server/jobs/jobs.service';
import { In, Repository } from 'typeorm';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLabel } from './email-label.entity';
import { EmailMessage } from './email-message.entity';
import { EmailMessageLabel } from './email-message-label.entity';
import { EmailParticipant } from './email-participant.entity';
import { EmailThread } from './email-thread.entity';
import { IntegrationConnection } from './integration-connection.entity';
import { IntegrationOauthState } from './integration-oauth-state.entity';

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
export class IntegrationsService {
  private logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(IntegrationConnection)
    private readonly connectionRepository: Repository<IntegrationConnection>,
    @InjectRepository(IntegrationOauthState)
    private readonly oauthStateRepository: Repository<IntegrationOauthState>,
    @InjectRepository(EmailMessage)
    private readonly messageRepository: Repository<EmailMessage>,
    @InjectRepository(EmailParticipant)
    private readonly participantRepository: Repository<EmailParticipant>,
    @InjectRepository(EmailLabel)
    private readonly labelRepository: Repository<EmailLabel>,
    @InjectRepository(EmailAttachment)
    private readonly attachmentRepository: Repository<EmailAttachment>,
    private readonly configService: ConfigService<AppConfigurationType>,
    private readonly jobsService: JobsService,
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
        .from(IntegrationConnection)
        .where('id = :connectionId', { connectionId })
        .execute();
    });

    return { removed: true };
  }

  async createGmailAuthUrl(userId: string, redirectTo?: string | null) {
    const gmailConfig = this.getGmailConfig();

    if (!gmailConfig?.clientId || !gmailConfig?.clientSecret) {
      throw new Error('Missing Gmail OAuth configuration');
    }

    const state = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.oauthStateRepository.save({
      userId,
      provider: 'gmail',
      state,
      redirectTo: redirectTo ?? null,
      expiresAt,
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

  private getGmailConfig() {
    return this.configService.get<AppConfigurationType['integrations']>(
      'integrations',
    )?.gmail;
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

  private async refreshGmailToken(connection: IntegrationConnection) {
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

  private async getValidAccessToken(connection: IntegrationConnection) {
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
    connection: IntegrationConnection,
    triggerHistoryId?: string,
  ) {
    const accessToken = await this.getValidAccessToken(connection);
    const hasReadonlyScope = await this.ensureReadonlyScope(
      connection,
      accessToken,
    );

    await this.syncGmailLabels(connection, accessToken);

    const syncState = (connection.syncState ?? {}) as {
      historyId?: string;
      initialSyncCompleted?: boolean;
    };

    if (!syncState.initialSyncCompleted) {
      await this.initialUnreadSync(connection, accessToken, hasReadonlyScope);
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
    connection: IntegrationConnection,
    accessToken: string,
    hasReadonlyScope: boolean,
  ) {
    let pageToken: string | undefined;
    let batchCount = 0;

    do {
      const response = await this.listGmailMessages(accessToken, {
        labelIds: ['UNREAD'],
        pageToken,
      });

      const messages = response.messages ?? [];
      for (const message of messages) {
        await this.persistGmailMessage(
          connection,
          accessToken,
          message.id,
          hasReadonlyScope,
        );
      }

      pageToken = response.nextPageToken;
      batchCount += 1;
    } while (pageToken && batchCount < 10);
  }

  private async applyHistoryDelta(
    connection: IntegrationConnection,
    accessToken: string,
    hasReadonlyScope: boolean,
    startHistoryId: string,
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
    connection: IntegrationConnection,
    accessToken: string,
    messageId: string,
    hasReadonlyScope: boolean,
  ) {
    const message = await this.getGmailMessage(
      accessToken,
      messageId,
      hasReadonlyScope ? 'full' : 'metadata',
    );
    const isUnread = message.labelIds?.includes('UNREAD') ?? false;

    if (!isUnread) {
      return;
    }

    const payload = message.payload;
    const headers = payload?.headers ?? [];

    const subject = getHeaderValue(headers, 'Subject') ?? null;
    const messageIdHeader = getHeaderValue(headers, 'Message-ID') ?? null;
    const from = parseAddressList(getHeaderValue(headers, 'From'));
    const to = parseAddressList(getHeaderValue(headers, 'To'));
    const cc = parseAddressList(getHeaderValue(headers, 'Cc'));
    const bcc = parseAddressList(getHeaderValue(headers, 'Bcc'));
    const replyTo = parseAddressList(getHeaderValue(headers, 'Reply-To'));

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
      storedMessage.sentAt = message.internalDate
        ? new Date(Number(message.internalDate))
        : null;
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

      if (hasReadonlyScope) {
        const attachments = await this.buildAttachmentEntities(
          accessToken,
          message,
          content.attachments,
          storedMessage.id,
        );

        if (attachments.length > 0) {
          await attachmentRepository.save(attachments);
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
    connection: IntegrationConnection,
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
    connection: IntegrationConnection,
    accessToken: string,
  ) {
    const scope = await this.fetchGoogleTokenScope(accessToken);

    console.log('scope', scope);

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
