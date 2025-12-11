import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('passkey')
export class Passkey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'name', nullable: true })
  name: string | null;

  @Column('text', { name: 'public_key' })
  publicKey!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'credential_id' })
  credentialID!: string;

  @Column('integer', { name: 'counter' })
  counter!: string;

  @Column('text', { name: 'device_type' })
  deviceType!: string;

  @Column('boolean', { name: 'backed_up' })
  backedUp!: boolean;

  @Column('text', { name: 'transports', nullable: true })
  transports: string | null;

  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date | null;

  @Column('text', { name: 'aaguid', nullable: true })
  aaguid: string | null;
}
