import type { DatasourceConnection } from './datasource-connection.entity';

export type ParsedAddress = {
  name: string | null;
  email: string;
};

export const parseSyncStartAt = (value?: string | null) => {
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
};

export const getSyncStartAt = (connection: DatasourceConnection) => {
  const syncState = (connection.syncState ?? {}) as {
    syncStartAt?: string | null;
  };
  if (!syncState.syncStartAt) {
    return null;
  }
  const parsed = new Date(syncState.syncStartAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const buildContactEntries = (
  entries: ParsedAddress[],
  firstMetAt: Date,
) => {
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
};
