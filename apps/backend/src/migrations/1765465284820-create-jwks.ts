import { type MigrationInterface, type QueryRunner, Table } from 'typeorm';

export class CreateJwks1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'jwks',
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
            name: 'public_key',
            type: 'text',
          },
          {
            name: 'private_key',
            type: 'text',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('jwks');
  }
}
