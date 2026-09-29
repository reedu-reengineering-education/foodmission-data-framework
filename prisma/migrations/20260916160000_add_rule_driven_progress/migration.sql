-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "missions" ADD COLUMN "ruleCode" TEXT;
ALTER TABLE "challenges" ADD COLUMN "ruleCode" TEXT;
ALTER TABLE "mission_progress" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "mission_progress" ADD COLUMN "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "mission_progress" ADD COLUMN "state" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "mission_progress" ADD COLUMN "ruleHash" TEXT;
ALTER TABLE "mission_progress" ADD COLUMN "evaluatedAt" TIMESTAMP(3);
ALTER TABLE "challenge_progress" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "challenge_progress" ADD COLUMN "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "challenge_progress" ADD COLUMN "state" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "challenge_progress" ADD COLUMN "ruleHash" TEXT;
ALTER TABLE "challenge_progress" ADD COLUMN "evaluatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "missions_ruleCode_idx" ON "missions"("ruleCode");
CREATE INDEX "challenges_ruleCode_idx" ON "challenges"("ruleCode");
CREATE INDEX "user_events_userId_eventType_createdAt_idx" ON "user_events"("userId", "eventType", "createdAt");
