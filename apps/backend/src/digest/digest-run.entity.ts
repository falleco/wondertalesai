import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DigestRunType = 'daily' | 'weekly';
export type DigestRunStatus = 'pending' | 'generated' | 'sent' | 'error';

@Entity('digest_run')
export class DigestRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'type' })
  type!: DigestRunType;

  @Column('timestamptz', { name: 'period_start' })
  periodStart!: Date;

  @Column('timestamptz', { name: 'period_end' })
  periodEnd!: Date;

  @Column('text', { name: 'status', default: 'pending' })
  status!: DigestRunStatus;

  @Column('timestamptz', { name: 'generated_at', nullable: true })
  generatedAt!: Date | null;

  @Column('timestamptz', { name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  @Column('text', { name: 'subject', nullable: true })
  subject!: string | null;

  @Column('text', { name: 'content_text', nullable: true })
  contentText!: string | null;

  @Column('text', { name: 'content_html', nullable: true })
  contentHtml!: string | null;

  @Column('jsonb', { name: 'stats', nullable: true })
  stats!: Record<string, unknown> | null;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
