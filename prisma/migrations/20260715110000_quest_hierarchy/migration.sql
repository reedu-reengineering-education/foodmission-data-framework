-- Phase 1B: Quest hierarchy, challenge nesting, progress status

CREATE TYPE "ProgressTrackingType" AS ENUM ('SOFT', 'PRECISION', 'ACHIEVEMENT');
CREATE TYPE "ChallengeScope" AS ENUM ('DAILY_STANDALONE', 'QUEST_ONE_TIME');
CREATE TYPE "ProgressStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'NOT_ACHIEVED');

CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "topicSlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "isPetQuest" BOOLEAN NOT NULL DEFAULT false,
    "streakEnabled" BOOLEAN NOT NULL DEFAULT false,
    "progressTrackingType" "ProgressTrackingType" NOT NULL DEFAULT 'SOFT',
    "content" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quests_slug_key" ON "quests"("slug");
CREATE INDEX "quests_missionId_idx" ON "quests"("missionId");

ALTER TABLE "quests" ADD CONSTRAINT "quests_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "quest_progress" (
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActionAt" TIMESTAMP(3),

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("userId","questId")
);

ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenges" ADD COLUMN "questId" TEXT;
ALTER TABLE "challenges" ADD COLUMN "challengeScope" "ChallengeScope" NOT NULL DEFAULT 'DAILY_STANDALONE';

CREATE INDEX "challenges_questId_idx" ON "challenges"("questId");
CREATE INDEX "challenges_challengeScope_idx" ON "challenges"("challengeScope");

ALTER TABLE "challenges" ADD CONSTRAINT "challenges_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "challenge_progress" ADD COLUMN "status" "ProgressStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "challenge_progress"
SET "status" = 'ACHIEVED'
WHERE "completed" = true;
