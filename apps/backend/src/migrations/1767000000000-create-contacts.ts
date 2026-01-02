import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateContacts1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contact',
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
            name: 'email',
            type: 'text',
          },
          {
            name: 'first_met_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
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
      'contact',
      new TableIndex({
        name: 'IDX_contact_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'contact',
      new TableIndex({
        name: 'IDX_contact_user_email',
        columnNames: ['user_id', 'email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contact');
  }
}
