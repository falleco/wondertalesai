import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WorkflowTriggerStatus = 'active' | 'paused';
export type WorkflowTriggerActionType = 'webhook';

@Entity('workflow_trigger')
export class WorkflowTrigger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'name' })
  name!: string;

  @Column('text', { name: 'conditions' })
  conditions!: string;

  @Column('text', { name: 'action_type' })
  actionType!: WorkflowTriggerActionType;

  @Column('jsonb', { name: 'action_config', nullable: true })
  actionConfig!: Record<string, unknown> | null;

  @Column('text', { name: 'status', default: 'active' })
  status!: WorkflowTriggerStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
