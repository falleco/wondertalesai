import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DatasourceProvider = 'fastmail' | 'gmail';
export type DatasourceStatus = 'connected' | 'error' | 'revoked' | 'pending';

@Entity('integration_connection')
export class DatasourceConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'provider' })
  provider!: DatasourceProvider;

  @Column('text', { name: 'status', default: 'pending' })
  status!: DatasourceStatus;

  @Column('text', { name: 'provider_account_id', nullable: true })
  providerAccountId!: string | null;

  @Column('text', { name: 'provider_email', nullable: true })
  providerEmail!: string | null;

  @Column('text', { name: 'access_token', nullable: true })
  accessToken!: string | null;

  @Column('text', { name: 'refresh_token', nullable: true })
  refreshToken!: string | null;

  @Column('timestamptz', { name: 'access_token_expires_at', nullable: true })
  accessTokenExpiresAt!: Date | null;

  @Column('text', { name: 'scope', nullable: true })
  scope!: string | null;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column('jsonb', { name: 'sync_state', nullable: true })
  syncState!: Record<string, unknown> | null;

  @Column('timestamptz', { name: 'last_synced_at', nullable: true })
  lastSyncedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
