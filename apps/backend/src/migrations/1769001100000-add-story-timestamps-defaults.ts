import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddStoryTimestampsDefaults1769001100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "story" SET "created_at" = NOW() WHERE "created_at" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "story" SET "updated_at" = NOW() WHERE "updated_at" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "story_page" SET "created_at" = NOW() WHERE "created_at" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "story" ALTER COLUMN "created_at" SET DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE "story" ALTER COLUMN "updated_at" SET DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE "story_page" ALTER COLUMN "created_at" SET DEFAULT NOW()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "story_page" ALTER COLUMN "created_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "story" ALTER COLUMN "updated_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "story" ALTER COLUMN "created_at" DROP DEFAULT`,
    );
  }
}
