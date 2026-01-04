import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SenderProfileStatus =
  | 'active'
  | 'unsubscribed'
  | 'blocked'
  | 'ignored'
  | 'important';

@Entity('sender_profile')
export class SenderProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'sender_key' })
  senderKey!: string;

  @Column('text', { name: 'sender_email', nullable: true })
  senderEmail!: string | null;

  @Column('text', { name: 'sender_domain', nullable: true })
  senderDomain!: string | null;

  @Column('text', { name: 'sender_name', nullable: true })
  senderName!: string | null;

  @Column('int', { name: 'message_count_30d', default: 0 })
  messageCount30d!: number;

  @Column('int', { name: 'message_count_7d', default: 0 })
  messageCount7d!: number;

  @Column('double precision', { name: 'read_rate_30d', default: 0 })
  readRate30d!: number;

  @Column('boolean', { name: 'has_list_unsubscribe', default: false })
  hasListUnsubscribe!: boolean;

  @Column('jsonb', { name: 'unsubscribe_links', nullable: true })
  unsubscribeLinks!: string[] | null;

  @Column('jsonb', { name: 'example_subjects', nullable: true })
  exampleSubjects!: string[] | null;

  @Column('double precision', { name: 'marketing_score', default: 0 })
  marketingScore!: number;

  @Column('double precision', { name: 'low_value_score', default: 0 })
  lowValueScore!: number;

  @Column('double precision', { name: 'disguised_marketing_score', default: 0 })
  disguisedMarketingScore!: number;

  @Column('timestamptz', { name: 'last_evaluated_at', nullable: true })
  lastEvaluatedAt!: Date | null;

  @Column('text', { name: 'status', default: 'active' })
  status!: SenderProfileStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
