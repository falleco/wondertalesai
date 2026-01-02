import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateWorkflowTriggers1766670100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workflow_trigger',
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
            name: 'name',
            type: 'text',
          },
          {
            name: 'conditions',
            type: 'text',
          },
          {
            name: 'action_type',
            type: 'text',
          },
          {
            name: 'action_config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'text',
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'workflow_trigger',
      new TableIndex({
        name: 'IDX_workflow_trigger_user',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'workflow_trigger',
      'IDX_workflow_trigger_user',
    );
    await queryRunner.dropTable('workflow_trigger');
  }
}
