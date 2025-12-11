import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateMember1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'member',
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
            name: 'organization_id',
            type: 'varchar',
          },
          {
            name: 'user_id',
            type: 'varchar',
          },
          {
            name: 'role',
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
      'member',
      new TableIndex({
        name: 'IDX_member_user_id_organization_id',
        columnNames: ['user_id', 'organization_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'member',
      new TableForeignKey({
        name: 'fk_member_organization_id',
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'member',
      new TableForeignKey({
        name: 'fk_member_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('member');
  }
}
