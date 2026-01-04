import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import { ContactsService } from './contacts.service';

@Injectable()
export class ContactsRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly contactsService: ContactsService,
  ) {}

  buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure
        .meta({
          tags: ['Contacts'],
          summary: 'List contacts',
        })
        .use(authRequired)
        .input(
          z
            .object({
              page: z.number().int().min(1).optional(),
              pageSize: z.number().int().min(1).max(50).optional(),
            })
            .optional(),
        )
        .query(({ ctx, input }) => {
          return this.contactsService.listContacts(ctx.user.id, input);
        }),
    });
  }
}
