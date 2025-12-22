import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EmailParticipantRole = 'from' | 'to' | 'cc' | 'bcc' | 'reply-to';

@Entity('email_participant')
export class EmailParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'message_id' })
  messageId!: string;

  @Column('text', { name: 'role' })
  role!: EmailParticipantRole;

  @Column('text', { name: 'email' })
  email!: string;

  @Column('text', { name: 'name', nullable: true })
  name!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
