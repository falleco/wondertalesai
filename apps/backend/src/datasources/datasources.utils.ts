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

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')]+/gi;
const MAILTO_REGEX = /\bmailto:[^\s<>"')]+/gi;

const parseListUnsubscribeLinks = (value?: string | null) => {
  if (!value) {
    return [];
  }
  const candidates: string[] = [];
  const matches = value.match(/<([^>]+)>/g);
  if (matches && matches.length > 0) {
    for (const match of matches) {
      candidates.push(match.replace(/[<>]/g, '').trim());
    }
  } else {
    candidates.push(
      ...value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }
  return candidates.filter(
    (link) =>
      link.startsWith('http://') ||
      link.startsWith('https://') ||
      link.startsWith('mailto:'),
  );
};

export const extractUnsubscribeLinks = (input: {
  text?: string | null;
  html?: string | null;
  snippet?: string | null;
  listUnsubscribe?: string | null;
}) => {
  const links = new Set<string>();

  const listUnsubscribeLinks = parseListUnsubscribeLinks(input.listUnsubscribe);
  for (const link of listUnsubscribeLinks) {
    links.add(link);
  }

  const sources = [input.text, input.html, input.snippet]
    .filter(Boolean)
    .join(' ');

  const urls = sources.match(URL_REGEX) ?? [];
  for (const url of urls) {
    if (url.toLowerCase().includes('unsubscribe')) {
      links.add(url);
    }
  }

  const mailtos = sources.match(MAILTO_REGEX) ?? [];
  for (const mailto of mailtos) {
    if (mailto.toLowerCase().includes('unsubscribe')) {
      links.add(mailto);
    }
  }

  return Array.from(links);
};
