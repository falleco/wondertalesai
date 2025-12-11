import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('member')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'organization_id' })
  organizationId!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'role' })
  role!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
