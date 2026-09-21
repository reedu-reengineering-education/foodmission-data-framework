-- Badges become rule-driven, like missions and challenges.
--
-- `badges.ruleCode` points at an entry in
-- prisma/seeds/data/rules/badges.rules.yml; `badge_progress` mirrors
-- mission_progress so "3 of 5 quests" can be shown before the badge is earned.
-- The terminal state stays in user_earned_badges.
--
-- Every column added here is defaulted or nullable and the new table is
-- empty, so this is a non-blocking migration with no backfill.

-- AlterEnum
ALTER TYPE "RewardSourceType" ADD VALUE 'BADGE';

-- AlterTable
ALTER TABLE "badges" ADD COLUMN "ruleCode" TEXT;
ALTER TABLE "badges" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "badges" ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "badges_ruleCode_key" ON "badges"("ruleCode");
CREATE INDEX "badges_ruleCode_idx" ON "badges"("ruleCode");
CREATE INDEX "badges_sortOrder_idx" ON "badges"("sortOrder");

-- CreateTable
CREATE TABLE "badge_progress" (
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "state" JSONB NOT NULL DEFAULT '{}',
    "ruleHash" TEXT,
    "evaluatedAt" TIMESTAMP(3),

    CONSTRAINT "badge_progress_pkey" PRIMARY KEY ("userId","badgeId")
);

-- CreateIndex
CREATE INDEX "badge_progress_badgeId_idx" ON "badge_progress"("badgeId");

-- AddForeignKey
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
