import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type StorySeed = {
  hero: string;
  companion: string;
  location: string;
  magicItem: string;
  mood: string;
};

export type StoryStatus = 'in_progress' | 'awaiting_title' | 'completed';

@Entity('story')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'user_id' })
  @Index()
  userId!: string;

  @Column('text', { nullable: true })
  title!: string | null;

  @Column('text')
  theme!: string;

  @Column('text', { default: 'in_progress' })
  status!: StoryStatus;

  @Column('text', { name: 'cover_image_url', nullable: true })
  coverImageUrl!: string | null;

  @Column('jsonb', { name: 'title_options', nullable: true })
  titleOptions!: string[] | null;

  @Column('jsonb', { name: 'seed', nullable: true })
  seed!: StorySeed | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
