export enum Queues {
  DUMMY = 'dummy',
  EMAIL = 'email',
  GMAIL_SYNC = 'gmail-sync',
  JMAP_SYNC = 'jmap-sync',
  WEEKLY_DIGEST = 'weekly-digest',
  DIGEST_RUN = 'digest-run',
  LLM_ANALYSIS = 'llm-analysis',
}

export type DummyPayload = {
  ping: string;
};

export type SendEmailPayload = {
  templateId: string;
  to: string;
  payload: Record<string, unknown>;
};

export type GmailSyncPayload = {
  connectionId: string;
  triggerHistoryId?: string;
  reason?: 'initial' | 'push' | 'manual';
};

export type JmapSyncPayload = {
  connectionId: string;
  reason?: 'initial' | 'manual';
};

export type LlmAnalysisPayload = {
  type: 'email' | 'thread' | 'attachment';
  userId: string;
  messageId?: string;
  threadId?: string;
  attachmentId?: string;
};

export type WeeklyDigestPayload = {
  runAt?: string;
};

export type DigestRunPayload = {
  runAt?: string;
};
