-- Rename gamification_events to user_events and normalize columns.

ALTER TABLE "gamification_events" RENAME TO "user_events";

ALTER TABLE "user_events" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'legacy';

UPDATE "user_events"
SET
  "source" = CASE
    WHEN "eventType" = 'ONBOARDING_COMPLETED' THEN 'onboarding'
    WHEN "eventType" IN ('POINTS_AWARDED', 'XP_AWARDED') THEN 'wallet'
    WHEN "subjectType" = 'SEED' THEN 'seed'
    ELSE 'api'
  END,
  "payload" = CASE
    WHEN "subjectType" IS NOT NULL THEN
      COALESCE("payload", '{}'::jsonb) || jsonb_build_object(
        'subject',
        jsonb_strip_nulls(
          jsonb_build_object('type', "subjectType", 'id', "subjectId")
        )
      )
    ELSE COALESCE("payload", '{}'::jsonb)
  END;

ALTER TABLE "user_events" RENAME COLUMN "payload" TO "metadata";

ALTER TABLE "user_events" DROP COLUMN "subjectType";
ALTER TABLE "user_events" DROP COLUMN "subjectId";

CREATE INDEX "user_events_source_createdAt_idx" ON "user_events"("source", "createdAt");
