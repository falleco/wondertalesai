import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type DigestItemKind = 'message' | 'thread' | 'action_item';

@Entity('digest_item')
export class DigestItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'digest_run_id' })
  digestRunId!: string;

  @Column('text', { name: 'kind' })
  kind!: DigestItemKind;

  @Column('text', { name: 'message_id', nullable: true })
  messageId!: string | null;

  @Column('text', { name: 'thread_id', nullable: true })
  threadId!: string | null;

  @Column('text', { name: 'title' })
  title!: string;

  @Column('text', { name: 'summary' })
  summary!: string;

  @Column('text', { name: 'category', nullable: true })
  category!: string | null;

  @Column('boolean', { name: 'is_critical', default: false })
  isCritical!: boolean;

  @Column('boolean', { name: 'action_required', default: false })
  actionRequired!: boolean;

  @Column('timestamptz', { name: 'due_date', nullable: true })
  dueDate!: Date | null;

  @Column('double precision', { name: 'priority_score', default: 0 })
  priorityScore!: number;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
