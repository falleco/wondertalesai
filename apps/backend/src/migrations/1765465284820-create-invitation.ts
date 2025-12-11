import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateInvitation1765465284820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'invitation',
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
            name: 'email',
            type: 'text',
          },
          {
            name: 'role',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
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
            name: 'inviter_id',
            type: 'varchar',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'invitation',
      new TableIndex({
        name: 'IDX_invitation_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'invitation',
      new TableIndex({
        name: 'IDX_invitation_email_organization_id',
        columnNames: ['email', 'organization_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'invitation',
      new TableForeignKey({
        name: 'fk_invitation_organization_id',
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invitation',
      new TableForeignKey({
        name: 'fk_invitation_inviter_id',
        columnNames: ['inviter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invitation');
  }
}
