-- Add stable slugs for gamification i18n keys (Phase 1A)

ALTER TABLE "missions" ADD COLUMN "slug" TEXT;

UPDATE "missions"
SET "slug" = trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

ALTER TABLE "missions" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "missions_slug_key" ON "missions"("slug");

ALTER TABLE "challenges" ADD COLUMN "slug" TEXT;

UPDATE "challenges"
SET "slug" = trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

ALTER TABLE "challenges" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");
