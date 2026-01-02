import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contact')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'email' })
  email!: string;

  @Column('timestamptz', { name: 'first_met_at', nullable: true })
  firstMetAt!: Date | null;

  @Column('text', { name: 'name', nullable: true })
  name!: string | null;

  @Column('text', { name: 'description', nullable: true })
  description!: string | null;

  @Column('text', { name: 'tags', array: true, nullable: true })
  tags!: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
