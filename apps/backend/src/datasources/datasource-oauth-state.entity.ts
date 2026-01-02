import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('integration_oauth_state')
export class DatasourceOauthState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'provider' })
  provider!: string;

  @Column('text', { name: 'state', unique: true })
  state!: string;

  @Column('text', { name: 'redirect_to', nullable: true })
  redirectTo!: string | null;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt!: Date;

  @Column('timestamptz', { name: 'sync_start_at', nullable: true })
  syncStartAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
