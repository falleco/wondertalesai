import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('jwks')
export class Jwks {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'public_key' })
  publicKey!: string;

  @Column('text', { name: 'private_key' })
  privateKey!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column('date', { name: 'expires_at', nullable: true })
  expiresAt: Date | null;
}
