import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateStories1769001000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'story',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'theme',
            type: 'text',
          },
          {
            name: 'status',
            type: 'text',
            default: "'in_progress'",
          },
          {
            name: 'cover_image_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'title_options',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'seed',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'story',
      new TableIndex({
        name: 'IDX_story_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'story_page',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'story_id',
            type: 'uuid',
          },
          {
            name: 'page_number',
            type: 'int',
          },
          {
            name: 'text',
            type: 'text',
          },
          {
            name: 'image_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'audio_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'choices',
            type: 'jsonb',
          },
          {
            name: 'image_prompt',
            type: 'text',
          },
          {
            name: 'audio_prompt',
            type: 'text',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'story_page',
      new TableIndex({
        name: 'IDX_story_page_story',
        columnNames: ['story_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('story_page', 'IDX_story_page_story');
    await queryRunner.dropTable('story_page');
    await queryRunner.dropIndex('story', 'IDX_story_user');
    await queryRunner.dropTable('story');
  }
}
