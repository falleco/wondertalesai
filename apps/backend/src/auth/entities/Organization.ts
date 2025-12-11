import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('organization')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'name' })
  name!: string;

  @Column('text', { name: 'slug', unique: true })
  slug!: string;

  @Column('text', { name: 'logo', nullable: true })
  logo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column('text', { name: 'metadata', nullable: true })
  metadata: string | null;
}
