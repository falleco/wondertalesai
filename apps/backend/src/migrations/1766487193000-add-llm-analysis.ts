import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class AddLlmAnalysis1766487193000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "email_message" ADD COLUMN "llm_processed" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "email_message" ADD COLUMN "llm_processed_at" timestamptz',
    );

    await queryRunner.query(
      'ALTER TABLE "email_thread" ADD COLUMN "llm_processed" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "email_thread" ADD COLUMN "llm_processed_at" timestamptz',
    );

    await queryRunner.query(
      'ALTER TABLE "email_attachment" ADD COLUMN "llm_processed" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "email_attachment" ADD COLUMN "llm_processed_at" timestamptz',
    );

    await queryRunner.createTable(
      new Table({
        name: 'llm_integration',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            isNullable: false,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'text',
          },
          {
            name: 'provider',
            type: 'text',
          },
          {
            name: 'model',
            type: 'text',
          },
          {
            name: 'api_key',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'base_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'status',
            type: 'text',
            default: "'active'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'llm_integration',
      new TableIndex({
        name: 'IDX_llm_integration_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_analysis',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            isNullable: false,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'message_id',
            type: 'text',
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'keywords',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'raw_response',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'email_analysis',
      new TableIndex({
        name: 'IDX_email_analysis_message',
        columnNames: ['message_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'thread_analysis',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            isNullable: false,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'thread_id',
            type: 'text',
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'keywords',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'raw_response',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'thread_analysis',
      new TableIndex({
        name: 'IDX_thread_analysis_thread',
        columnNames: ['thread_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'attachment_analysis',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            isNullable: false,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'attachment_id',
            type: 'text',
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'keywords',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'raw_response',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'attachment_analysis',
      new TableIndex({
        name: 'IDX_attachment_analysis_attachment',
        columnNames: ['attachment_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'llm_usage',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            isNullable: false,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'text',
          },
          {
            name: 'provider',
            type: 'text',
          },
          {
            name: 'model',
            type: 'text',
          },
          {
            name: 'target_type',
            type: 'text',
          },
          {
            name: 'target_id',
            type: 'text',
          },
          {
            name: 'input_tokens',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'output_tokens',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'total_tokens',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'cost',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'text',
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'llm_usage',
      new TableIndex({
        name: 'IDX_llm_usage_user',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('llm_usage');
    await queryRunner.dropTable('attachment_analysis');
    await queryRunner.dropTable('thread_analysis');
    await queryRunner.dropTable('email_analysis');
    await queryRunner.dropTable('llm_integration');

    await queryRunner.query(
      'ALTER TABLE "email_attachment" DROP COLUMN "llm_processed_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "email_attachment" DROP COLUMN "llm_processed"',
    );

    await queryRunner.query(
      'ALTER TABLE "email_thread" DROP COLUMN "llm_processed_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "email_thread" DROP COLUMN "llm_processed"',
    );

    await queryRunner.query(
      'ALTER TABLE "email_message" DROP COLUMN "llm_processed_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "email_message" DROP COLUMN "llm_processed"',
    );
  }
}
