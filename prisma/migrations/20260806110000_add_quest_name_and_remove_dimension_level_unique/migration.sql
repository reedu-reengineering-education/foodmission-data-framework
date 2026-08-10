ALTER TABLE "quests"
ADD COLUMN "name" TEXT;

DROP INDEX IF EXISTS "quests_dimensionId_level_key";

CREATE INDEX IF NOT EXISTS "quests_dimensionId_level_idx" ON "quests"("dimensionId", "level");