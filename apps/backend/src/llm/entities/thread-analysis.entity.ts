import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('thread_analysis')
export class ThreadAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'thread_id' })
  threadId!: string;

  @Column('text', { name: 'summary', nullable: true })
  summary!: string | null;

  @Column('text', { name: 'tags', array: true, nullable: true })
  tags!: string[] | null;

  @Column('text', { name: 'keywords', array: true, nullable: true })
  keywords!: string[] | null;

  @Column('jsonb', { name: 'actions', nullable: true })
  actions!: Array<Record<string, unknown>> | null;

  @Column('jsonb', { name: 'raw_response', nullable: true })
  rawResponse!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
