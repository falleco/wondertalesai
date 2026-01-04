import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type UnsubscribeActionType =
  | 'opened_link'
  | 'sent_mailto'
  | 'blocked'
  | 'ignored'
  | 'marked_done';

@Entity('unsubscribe_event')
export class UnsubscribeEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'sender_profile_id' })
  senderProfileId!: string;

  @Column('text', { name: 'action_type' })
  actionType!: UnsubscribeActionType;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
