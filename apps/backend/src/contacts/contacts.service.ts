import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contact } from './contacts.entity';

type ContactUpsertInput = {
  email: string;
  name?: string | null;
  firstMetAt?: Date | null;
};

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async listContacts(
    userId: string,
    input?: { page?: number; pageSize?: number },
  ) {
    const pageSize = Math.min(Math.max(input?.pageSize ?? 20, 1), 50);
    const page = Math.max(input?.page ?? 1, 1);

    const total = await this.contactRepository.count({
      where: { userId },
    });

    const contacts = await this.contactRepository.find({
      where: { userId },
      order: { firstMetAt: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      contacts: contacts.map((contact) => ({
        id: contact.id,
        email: contact.email,
        name: contact.name,
        description: contact.description,
        tags: contact.tags ?? [],
        firstMetAt: contact.firstMetAt,
        createdAt: contact.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async upsertContacts(userId: string, inputs: ContactUpsertInput[]) {
    const normalized = new Map<string, ContactUpsertInput>();

    for (const entry of inputs) {
      const email = entry.email.trim().toLowerCase();
      if (!email) {
        continue;
      }
      const existing = normalized.get(email);
      if (!existing) {
        normalized.set(email, {
          email,
          name: entry.name ?? null,
          firstMetAt: entry.firstMetAt ?? null,
        });
        continue;
      }

      if (!existing.name && entry.name) {
        existing.name = entry.name;
      }
      if (entry.firstMetAt) {
        if (!existing.firstMetAt || entry.firstMetAt < existing.firstMetAt) {
          existing.firstMetAt = entry.firstMetAt;
        }
      }
    }

    if (normalized.size === 0) {
      return { upserted: 0 };
    }

    const emails = Array.from(normalized.keys());
    const existingContacts = await this.contactRepository.find({
      where: { userId, email: In(emails) },
    });
    const existingByEmail = new Map(
      existingContacts.map((contact) => [contact.email, contact]),
    );

    const toSave: Contact[] = [];
    for (const entry of normalized.values()) {
      const existing = existingByEmail.get(entry.email);
      const firstMetAt = entry.firstMetAt ?? new Date();

      if (existing) {
        let updated = false;
        if (!existing.name && entry.name) {
          existing.name = entry.name;
          updated = true;
        }
        if (!existing.firstMetAt || firstMetAt < existing.firstMetAt) {
          existing.firstMetAt = firstMetAt;
          updated = true;
        }
        if (updated) {
          toSave.push(existing);
        }
      } else {
        toSave.push(
          this.contactRepository.create({
            userId,
            email: entry.email,
            name: entry.name ?? null,
            description: null,
            tags: [],
            firstMetAt,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
      }
    }

    if (toSave.length > 0) {
      await this.contactRepository.save(toSave);
    }

    return { upserted: toSave.length };
  }
}
