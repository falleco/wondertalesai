import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('verification')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'identifier' })
  identifier!: string;

  @Column('text', { name: 'value' })
  value!: string;

  @Column('date', { name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
