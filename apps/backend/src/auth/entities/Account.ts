import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('account')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'account_id' })
  accountId!: string;

  @Column('text', { name: 'provider_id' })
  providerId!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'access_token', nullable: true })
  accessToken: string | null;

  @Column('text', { name: 'refresh_token', nullable: true })
  refreshToken: string | null;

  @Column('text', { name: 'id_token', nullable: true })
  idToken: string | null;

  @Column('date', { name: 'access_token_expires_at', nullable: true })
  accessTokenExpiresAt: Date | null;

  @Column('date', { name: 'refresh_token_expires_at', nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Column('text', { name: 'scope', nullable: true })
  scope: string | null;

  @Column('text', { name: 'password', nullable: true })
  password: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
