import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('weekly_digest_log')
export class WeeklyDigestLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('int', { name: 'sender_count', default: 0 })
  senderCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
