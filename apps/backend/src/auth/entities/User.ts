import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'name' })
  name!: string;

  @Column('text', { name: 'email', unique: true })
  email!: string;

  @Column('boolean', { name: 'email_verified' })
  emailVerified!: boolean;

  @Column('text', { name: 'image', nullable: true })
  image: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column('text', { name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string | null;

  @Column('boolean', { name: 'two_factor_enabled', nullable: true })
  twoFactorEnabled: boolean | null;

  @Column('text', { name: 'role', nullable: true })
  role: string | null;

  @Column('boolean', { name: 'banned', nullable: true })
  banned: boolean | null;

  @Column('text', { name: 'ban_reason', nullable: true })
  banReason: string | null;

  @Column('date', { name: 'ban_expires', nullable: true })
  banExpires: Date | null;

  @Column('date', { name: 'last_seen_at', nullable: true })
  lastSeenAt: Date | null;
}
