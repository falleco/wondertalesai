import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('noise_evaluation_run')
export class NoiseEvaluationRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('int', { name: 'sender_count', default: 0 })
  senderCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
