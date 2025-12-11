import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateAccount1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account',
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
            name: 'account_id',
            type: 'varchar',
          },
          {
            name: 'provider_id',
            type: 'varchar',
          },
          {
            name: 'user_id',
            type: 'varchar',
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
            name: 'id_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'access_token_expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'refresh_token_expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'scope',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'password',
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

    await queryRunner.createForeignKey(
      'account',
      new TableForeignKey({
        name: 'fk_account_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account');
  }
}
