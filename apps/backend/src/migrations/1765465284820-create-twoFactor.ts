import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTwoFactor1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'twoFactor',
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
            name: 'secret',
            type: 'text',
          },
          {
            name: 'backup_codes',
            type: 'text',
          },
          {
            name: 'user_id',
            type: 'varchar',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'twoFactor',
      new TableIndex({
        name: 'IDX_twoFactor_secret',
        columnNames: ['secret'],
      }),
    );

    await queryRunner.createForeignKey(
      'twoFactor',
      new TableForeignKey({
        name: 'fk_twoFactor_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('twoFactor');
  }
}
