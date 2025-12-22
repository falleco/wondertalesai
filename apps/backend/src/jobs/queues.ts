export enum Queues {
  DUMMY = 'dummy',
  EMAIL = 'email',
}

export type DummyPayload = {
  ping: string;
};

export type SendEmailPayload = {
  templateId: string;
  to: string;
  payload: Record<string, unknown>;
};
