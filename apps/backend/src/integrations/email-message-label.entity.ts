import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('email_message_label')
export class EmailMessageLabel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'message_id' })
  messageId!: string;

  @Column('text', { name: 'label_id' })
  labelId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
