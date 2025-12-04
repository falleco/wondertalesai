import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from 'viem';

@Entity({ name: 'example', comment: 'Example entity' })
export class ExampleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 500, type: 'varchar' })
  address: Address;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
