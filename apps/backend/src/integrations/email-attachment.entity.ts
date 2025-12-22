import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('email_attachment')
export class EmailAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'message_id' })
  messageId!: string;

  @Column('text', { name: 'provider_attachment_id', nullable: true })
  providerAttachmentId!: string | null;

  @Column('text', { name: 'filename', nullable: true })
  filename!: string | null;

  @Column('text', { name: 'mime_type', nullable: true })
  mimeType!: string | null;

  @Column('int', { name: 'size', nullable: true })
  size!: number | null;

  @Column('boolean', { name: 'is_inline', default: false })
  isInline!: boolean;

  @Column('text', { name: 'content_id', nullable: true })
  contentId!: string | null;

  @Column('bytea', { name: 'content', nullable: true })
  content!: Buffer | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
