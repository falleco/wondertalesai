export enum Queues {
  DUMMY = 'dummy',
  EMAIL = 'email',
  EMAIL_SYNC = 'email-sync',
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
