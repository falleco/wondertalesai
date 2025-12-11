import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePasskey1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'passkey',
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
            isNullable: true,
          },
          {
            name: 'public_key',
            type: 'text',
          },
          {
            name: 'user_id',
            type: 'varchar',
          },
          {
            name: 'credential_id',
            type: 'varchar',
          },
          {
            name: 'counter',
            type: 'integer',
          },
          {
            name: 'device_type',
            type: 'text',
          },
          {
            name: 'backed_up',
            type: 'boolean',
          },
          {
            name: 'transports',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'aaguid',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'passkey',
      new TableForeignKey({
        name: 'fk_passkey_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('passkey');
  }
}
