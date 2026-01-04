import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoiseFeature1767000300000 implements MigrationInterface {
  name = 'AddNoiseFeature1767000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sender_profile" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "sender_key" text NOT NULL,
        "sender_email" text,
        "sender_domain" text,
        "sender_name" text,
        "message_count_30d" integer NOT NULL DEFAULT 0,
        "message_count_7d" integer NOT NULL DEFAULT 0,
        "read_rate_30d" double precision NOT NULL DEFAULT 0,
        "has_list_unsubscribe" boolean NOT NULL DEFAULT false,
        "unsubscribe_links" jsonb,
        "example_subjects" jsonb,
        "marketing_score" double precision NOT NULL DEFAULT 0,
        "low_value_score" double precision NOT NULL DEFAULT 0,
        "disguised_marketing_score" double precision NOT NULL DEFAULT 0,
        "last_evaluated_at" timestamptz,
        "status" text NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sender_profile_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_sender_profile_user_key"
      ON "sender_profile" ("user_id", "sender_key")
    `);

    await queryRunner.query(`
      CREATE TABLE "unsubscribe_event" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "sender_profile_id" text NOT NULL,
        "action_type" text NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unsubscribe_event_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "block_rule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "match_type" text NOT NULL,
        "value" text NOT NULL,
        "action" text NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_block_rule_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "weekly_cleanup_digest_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_preferences_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_preferences_user" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "noise_evaluation_run" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "sender_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_noise_evaluation_run_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "weekly_digest_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" text NOT NULL,
        "sender_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_weekly_digest_log_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "is_archived" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "is_noise" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "is_blocked" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      ADD COLUMN "block_rule_id" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "block_rule_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "is_blocked"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "is_noise"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_message"
      DROP COLUMN "is_archived"
    `);

    await queryRunner.query(`DROP TABLE "weekly_digest_log"`);
    await queryRunner.query(`DROP TABLE "noise_evaluation_run"`);
    await queryRunner.query(`DROP TABLE "user_preferences"`);
    await queryRunner.query(`DROP TABLE "block_rule"`);
    await queryRunner.query(`DROP TABLE "unsubscribe_event"`);
    await queryRunner.query(`DROP INDEX "IDX_sender_profile_user_key"`);
    await queryRunner.query(`DROP TABLE "sender_profile"`);
  }
}
