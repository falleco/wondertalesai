import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddContactTimestampsDefaults1767000100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "contact" ALTER COLUMN "created_at" SET DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "contact" ALTER COLUMN "updated_at" SET DEFAULT now()',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "contact" ALTER COLUMN "updated_at" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "contact" ALTER COLUMN "created_at" DROP DEFAULT',
    );
  }
}
