import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateIntegrations1766390416000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'integration_connection',
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
            name: 'status',
            type: 'text',
            default: "'pending'",
          },
          {
            name: 'provider_account_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'provider_email',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'access_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refresh_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'access_token_expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'scope',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'sync_state',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'last_synced_at',
            type: 'timestamptz',
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
    );

    await queryRunner.createIndex(
      'integration_connection',
      new TableIndex({
        name: 'IDX_integration_connection_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'integration_connection',
      new TableIndex({
        name: 'IDX_integration_connection_identity',
        columnNames: ['user_id', 'provider', 'provider_email'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'integration_oauth_state',
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
            name: 'state',
            type: 'text',
          },
          {
            name: 'redirect_to',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'integration_oauth_state',
      new TableIndex({
        name: 'IDX_integration_oauth_state_state',
        columnNames: ['state'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_thread',
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
            name: 'connection_id',
            type: 'text',
          },
          {
            name: 'provider_thread_id',
            type: 'text',
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'snippet',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_message_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'message_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'unread_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
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
    );

    await queryRunner.createIndex(
      'email_thread',
      new TableIndex({
        name: 'IDX_email_thread_connection',
        columnNames: ['connection_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_thread',
      new TableIndex({
        name: 'IDX_email_thread_provider',
        columnNames: ['connection_id', 'provider_thread_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_message',
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
            name: 'connection_id',
            type: 'text',
          },
          {
            name: 'thread_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'provider_message_id',
            type: 'text',
          },
          {
            name: 'message_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'snippet',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'text_body',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'html_body',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sent_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'is_unread',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
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
    );

    await queryRunner.createIndex(
      'email_message',
      new TableIndex({
        name: 'IDX_email_message_connection',
        columnNames: ['connection_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_message',
      new TableIndex({
        name: 'IDX_email_message_thread',
        columnNames: ['thread_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_message',
      new TableIndex({
        name: 'IDX_email_message_provider',
        columnNames: ['connection_id', 'provider_message_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_participant',
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
            name: 'role',
            type: 'text',
          },
          {
            name: 'email',
            type: 'text',
          },
          {
            name: 'name',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'email_participant',
      new TableIndex({
        name: 'IDX_email_participant_message',
        columnNames: ['message_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_label',
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
            name: 'connection_id',
            type: 'text',
          },
          {
            name: 'provider_label_id',
            type: 'text',
          },
          {
            name: 'name',
            type: 'text',
          },
          {
            name: 'type',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'background_color',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'text_color',
            type: 'text',
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
    );

    await queryRunner.createIndex(
      'email_label',
      new TableIndex({
        name: 'IDX_email_label_connection',
        columnNames: ['connection_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_label',
      new TableIndex({
        name: 'IDX_email_label_provider',
        columnNames: ['connection_id', 'provider_label_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_message_label',
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
            name: 'label_id',
            type: 'text',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'email_message_label',
      new TableIndex({
        name: 'IDX_email_message_label_message',
        columnNames: ['message_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_message_label',
      new TableIndex({
        name: 'IDX_email_message_label_unique',
        columnNames: ['message_id', 'label_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_attachment',
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
            name: 'provider_attachment_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'filename',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'size',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_inline',
            type: 'boolean',
            default: false,
          },
          {
            name: 'content_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'bytea',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'email_attachment',
      new TableIndex({
        name: 'IDX_email_attachment_message',
        columnNames: ['message_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_attachment');
    await queryRunner.dropTable('email_message_label');
    await queryRunner.dropTable('email_label');
    await queryRunner.dropTable('email_participant');
    await queryRunner.dropTable('email_message');
    await queryRunner.dropTable('email_thread');
    await queryRunner.dropTable('integration_oauth_state');
    await queryRunner.dropTable('integration_connection');
  }
}
