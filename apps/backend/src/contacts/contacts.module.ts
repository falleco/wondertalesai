import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrpcModule } from '@server/trpc/trpc.module';
import { Contact } from './contacts.entity';
import { ContactsRouterBuilder } from './contacts.router';
import { ContactsService } from './contacts.service';

@Module({
  imports: [forwardRef(() => TrpcModule), TypeOrmModule.forFeature([Contact])],
  providers: [ContactsService, ContactsRouterBuilder],
  exports: [ContactsService, ContactsRouterBuilder],
})
export class ContactsModule {}
