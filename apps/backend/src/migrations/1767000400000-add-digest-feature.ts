import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDigestFeature1767000400000 implements MigrationInterface {
  name = 'AddDigestFeature1767000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "digest_run" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "type" text NOT NULL,
        "period_start" timestamptz NOT NULL,
        "period_end" timestamptz NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "generated_at" timestamptz,
        "sent_at" timestamptz,
        "subject" text,
        "content_text" text,
        "content_html" text,
        "stats" jsonb,
        "error_message" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_digest_run_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "digest_item" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "digest_run_id" text NOT NULL,
        "kind" text NOT NULL,
        "message_id" text,
        "thread_id" text,
        "title" text NOT NULL,
        "summary" text NOT NULL,
        "category" text,
        "is_critical" boolean NOT NULL DEFAULT false,
        "action_required" boolean NOT NULL DEFAULT false,
        "due_date" timestamptz,
        "priority_score" double precision NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_digest_item_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "daily_digest_enabled" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "daily_digest_time_local" text NOT NULL DEFAULT '08:30'
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "weekly_digest_enabled" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "weekly_digest_day_of_week" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "digest_timezone" text NOT NULL DEFAULT 'UTC'
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "digest_max_items" integer NOT NULL DEFAULT 30
    `);

    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_category" text
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_is_critical" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_action_required" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_summary" text
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_action_items" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_confidence" double precision NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "triage_evaluated_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_evaluated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_confidence"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_action_items"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_summary"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_action_required"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_is_critical"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "triage_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "digest_max_items"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "digest_timezone"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "weekly_digest_day_of_week"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "weekly_digest_enabled"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "daily_digest_time_local"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "daily_digest_enabled"
    `);

    await queryRunner.query(`DROP TABLE "digest_item"`);
    await queryRunner.query(`DROP TABLE "digest_run"`);
  }
}
