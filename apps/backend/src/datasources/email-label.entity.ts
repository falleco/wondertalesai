import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_label')
export class EmailLabel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'connection_id' })
  connectionId!: string;

  @Column('text', { name: 'provider_label_id' })
  providerLabelId!: string;

  @Column('text', { name: 'name' })
  name!: string;

  @Column('text', { name: 'type', nullable: true })
  type!: string | null;

  @Column('text', { name: 'background_color', nullable: true })
  backgroundColor!: string | null;

  @Column('text', { name: 'text_color', nullable: true })
  textColor!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
