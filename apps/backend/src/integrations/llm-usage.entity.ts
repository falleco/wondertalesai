import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('llm_usage')
export class LlmUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'provider' })
  provider!: string;

  @Column('text', { name: 'model' })
  model!: string;

  @Column('text', { name: 'target_type' })
  targetType!: 'email' | 'thread' | 'attachment';

  @Column('text', { name: 'target_id' })
  targetId!: string;

  @Column('int', { name: 'input_tokens', nullable: true })
  inputTokens!: number | null;

  @Column('int', { name: 'output_tokens', nullable: true })
  outputTokens!: number | null;

  @Column('int', { name: 'total_tokens', nullable: true })
  totalTokens!: number | null;

  @Column('numeric', { name: 'cost', nullable: true })
  cost!: string | null;

  @Column('text', { name: 'status' })
  status!: 'success' | 'error';

  @Column('text', { name: 'error', nullable: true })
  error!: string | null;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
