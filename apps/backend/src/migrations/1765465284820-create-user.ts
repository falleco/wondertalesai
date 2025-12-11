import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateUser1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
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
            name: 'name',
            type: 'text',
          },
          {
            name: 'email',
            type: 'text',
          },
          {
            name: 'email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'image',
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
          {
            name: 'stripe_customer_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'two_factor_enabled',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'banned',
            type: 'boolean',
            isNullable: true,
            default: false,
          },
          {
            name: 'ban_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ban_expires',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'last_seen_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'user',
      new TableIndex({
        name: 'IDX_user_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user');
  }
}
