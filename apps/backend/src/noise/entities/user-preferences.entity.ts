import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id', unique: true })
  userId!: string;

  @Column('boolean', { name: 'weekly_cleanup_digest_enabled', default: true })
  weeklyCleanupDigestEnabled!: boolean;

  @Column('boolean', { name: 'daily_digest_enabled', default: true })
  dailyDigestEnabled!: boolean;

  @Column('text', { name: 'daily_digest_time_local', default: '08:30' })
  dailyDigestTimeLocal!: string;

  @Column('boolean', { name: 'weekly_digest_enabled', default: true })
  weeklyDigestEnabled!: boolean;

  @Column('int', { name: 'weekly_digest_day_of_week', default: 1 })
  weeklyDigestDayOfWeek!: number;

  @Column('text', { name: 'digest_timezone', default: 'UTC' })
  digestTimezone!: string;

  @Column('int', { name: 'digest_max_items', default: 30 })
  digestMaxItems!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
