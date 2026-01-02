import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddOauthStateSyncStart1767000200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "integration_oauth_state" ADD COLUMN "sync_start_at" timestamptz',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "integration_oauth_state" DROP COLUMN "sync_start_at"',
    );
  }
}
