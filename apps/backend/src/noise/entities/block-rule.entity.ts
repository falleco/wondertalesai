import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type BlockRuleMatchType =
  | 'senderEmail'
  | 'senderDomain'
  | 'subjectContains'
  | 'fromNameContains';

export type BlockRuleAction = 'archive' | 'tagOnly' | 'moveToNoise';

@Entity('block_rule')
export class BlockRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'match_type' })
  matchType!: BlockRuleMatchType;

  @Column('text', { name: 'value' })
  value!: string;

  @Column('text', { name: 'action' })
  action!: BlockRuleAction;

  @Column('boolean', { name: 'enabled', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
