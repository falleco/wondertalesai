import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddIntegrationTimestampsDefaults1766391100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "integration_oauth_state" ALTER COLUMN "created_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "integration_connection" ALTER COLUMN "created_at" SET DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "integration_connection" ALTER COLUMN "updated_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "email_thread" ALTER COLUMN "created_at" SET DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "email_thread" ALTER COLUMN "updated_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "email_message" ALTER COLUMN "created_at" SET DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "email_message" ALTER COLUMN "updated_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "email_label" ALTER COLUMN "created_at" SET DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "email_label" ALTER COLUMN "updated_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "email_message_label" ALTER COLUMN "created_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "email_attachment" ALTER COLUMN "created_at" SET DEFAULT now()',
    );

    await queryRunner.query(
      'ALTER TABLE "email_participant" ALTER COLUMN "created_at" SET DEFAULT now()',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "email_participant" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "email_attachment" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "email_message_label" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "email_label" ALTER COLUMN "updated_at" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "email_label" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "email_message" ALTER COLUMN "updated_at" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "email_message" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "email_thread" ALTER COLUMN "updated_at" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "email_thread" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "integration_connection" ALTER COLUMN "updated_at" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "integration_connection" ALTER COLUMN "created_at" DROP DEFAULT',
    );

    await queryRunner.query(
      'ALTER TABLE "integration_oauth_state" ALTER COLUMN "created_at" DROP DEFAULT',
    );
  }
}
