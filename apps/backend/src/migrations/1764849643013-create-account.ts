import { type MigrationInterface, type QueryRunner, Table, TableIndex, TableColumn } from 'typeorm';

export class CreateAccount1764849643013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'accountId',
            type: 'text',
          },
          {
            name: 'providerId',
            type: 'text',
          },
          {
            name: 'userId',
            type: 'text',
          },
          {
            name: 'accessToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refreshToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'idToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'accessTokenExpiresAt',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'refreshTokenExpiresAt',
            type: 'date',
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
            name: 'createdAt',
            type: 'date',
          },
          {
            name: 'updatedAt',
            type: 'date',
          }
        ],
      }),
    );

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account');
  }
}