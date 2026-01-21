import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type StoryChoice = {
  id: string;
  text: string;
  imageUrl: string | null;
  imagePrompt: string;
};

@Entity('story_page')
export class StoryPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'story_id' })
  @Index()
  storyId!: string;

  @Column('int', { name: 'page_number' })
  pageNumber!: number;

  @Column('text')
  text!: string;

  @Column('text', { name: 'image_url', nullable: true })
  imageUrl!: string | null;

  @Column('text', { name: 'audio_url', nullable: true })
  audioUrl!: string | null;

  @Column('jsonb', { name: 'choices' })
  choices!: StoryChoice[];

  @Column('text', { name: 'image_prompt' })
  imagePrompt!: string;

  @Column('text', { name: 'audio_prompt' })
  audioPrompt!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
