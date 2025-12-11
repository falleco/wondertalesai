import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateVerification1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'verification',
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
            name: 'identifier',
            type: 'text',
          },
          {
            name: 'value',
            type: 'text',
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
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
      'verification',
      new TableIndex({
        name: 'IDX_verification_identifier',
        columnNames: ['identifier'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('verification');
  }
}
