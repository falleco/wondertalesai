export enum Queues {
  DUMMY = 'dummy',
  EMAIL = 'email',
  EMAIL_SYNC = 'email-sync',
  JMAP_SYNC = 'jmap-sync',
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

export type EmailSyncPayload = {
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
