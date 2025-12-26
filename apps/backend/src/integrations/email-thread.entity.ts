import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_thread')
export class EmailThread {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'connection_id' })
  connectionId!: string;

  @Column('text', { name: 'provider_thread_id' })
  providerThreadId!: string;

  @Column('text', { name: 'subject', nullable: true })
  subject!: string | null;

  @Column('text', { name: 'snippet', nullable: true })
  snippet!: string | null;

  @Column('timestamptz', { name: 'last_message_at', nullable: true })
  lastMessageAt!: Date | null;

  @Column('int', { name: 'message_count', default: 0 })
  messageCount!: number;

  @Column('int', { name: 'unread_count', default: 0 })
  unreadCount!: number;

  @Column('boolean', { name: 'llm_processed', default: false })
  llmProcessed!: boolean;

  @Column('timestamptz', { name: 'llm_processed_at', nullable: true })
  llmProcessedAt!: Date | null;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
