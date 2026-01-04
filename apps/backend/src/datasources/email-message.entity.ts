import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_message')
export class EmailMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'connection_id' })
  connectionId!: string;

  @Column('text', { name: 'thread_id', nullable: true })
  threadId!: string | null;

  @Column('text', { name: 'provider_message_id' })
  providerMessageId!: string;

  @Column('text', { name: 'message_id', nullable: true })
  messageId!: string | null;

  @Column('text', { name: 'subject', nullable: true })
  subject!: string | null;

  @Column('text', { name: 'snippet', nullable: true })
  snippet!: string | null;

  @Column('text', { name: 'text_body', nullable: true })
  textBody!: string | null;

  @Column('text', { name: 'html_body', nullable: true })
  htmlBody!: string | null;

  @Column('timestamptz', { name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  @Column('boolean', { name: 'is_unread', default: true })
  isUnread!: boolean;

  @Column('boolean', { name: 'is_archived', default: false })
  isArchived!: boolean;

  @Column('boolean', { name: 'is_noise', default: false })
  isNoise!: boolean;

  @Column('boolean', { name: 'is_blocked', default: false })
  isBlocked!: boolean;

  @Column('text', { name: 'block_rule_id', nullable: true })
  blockRuleId!: string | null;

  @Column('boolean', { name: 'llm_processed', default: false })
  llmProcessed!: boolean;

  @Column('timestamptz', { name: 'llm_processed_at', nullable: true })
  llmProcessedAt!: Date | null;

  @Column('text', { name: 'triage_category', nullable: true })
  triageCategory!: string | null;

  @Column('boolean', { name: 'triage_is_critical', default: false })
  triageIsCritical!: boolean;

  @Column('boolean', { name: 'triage_action_required', default: false })
  triageActionRequired!: boolean;

  @Column('text', { name: 'triage_summary', nullable: true })
  triageSummary!: string | null;

  @Column('jsonb', { name: 'triage_action_items', nullable: true })
  triageActionItems!: Array<{ task: string; dueDate?: string | null }> | null;

  @Column('double precision', { name: 'triage_confidence', default: 0 })
  triageConfidence!: number;

  @Column('timestamptz', { name: 'triage_evaluated_at', nullable: true })
  triageEvaluatedAt!: Date | null;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
