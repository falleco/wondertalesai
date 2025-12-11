import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateOrganization1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organization',
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
            name: 'slug',
            type: 'text',
          },
          {
            name: 'logo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'organization',
      new TableIndex({
        name: 'IDX_organization_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('organization');
  }
}
