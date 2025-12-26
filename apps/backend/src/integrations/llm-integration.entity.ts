import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LlmProvider = 'openai' | 'ollama';

@Entity('llm_integration')
export class LlmIntegration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'provider' })
  provider!: LlmProvider;

  @Column('text', { name: 'model' })
  model!: string;

  @Column('text', { name: 'api_key', nullable: true })
  apiKey!: string | null;

  @Column('text', { name: 'base_url', nullable: true })
  baseUrl!: string | null;

  @Column('boolean', { name: 'is_default', default: false })
  isDefault!: boolean;

  @Column('text', { name: 'status', default: 'active' })
  status!: string;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
