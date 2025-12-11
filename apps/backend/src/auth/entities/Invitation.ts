import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('invitation')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'organization_id' })
  organizationId!: string;

  @Column('text', { name: 'email', unique: true })
  email!: string;

  @Column('text', { name: 'role', nullable: true })
  role: string | null;

  @Column('text', { name: 'status' })
  status!: string;

  @Column('date', { name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column('text', { name: 'inviter_id' })
  inviterId!: string;
}
