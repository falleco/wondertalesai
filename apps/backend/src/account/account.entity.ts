import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('account')
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'name', nullable: true })
  name: string;

  @Column('text', { name: 'email', unique: true })
  email: string;

  @Column('text', { name: 'image', nullable: true })
  image: string | null;

  @Column({
    nullable: false,
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  isActive: boolean;

  @Column('date', { name: 'last_seen_at', nullable: true })
  lastSeenAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
