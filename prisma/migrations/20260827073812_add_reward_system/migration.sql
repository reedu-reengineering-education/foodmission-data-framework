-- CreateEnum
CREATE TYPE "RewardSourceType" AS ENUM ('MISSION', 'CHALLENGE', 'QUEST', 'QUIZ');

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");

-- AlterTable: Reward — replace badge (plain string) with badgeId (FK to badges)
ALTER TABLE "rewards" DROP COLUMN IF EXISTS "badge";
ALTER TABLE "rewards" ADD COLUMN "badgeId" TEXT;

-- AddForeignKey: Reward -> Badge
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_badgeId_fkey"
    FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Mission — add rewardId
ALTER TABLE "missions" ADD COLUMN "rewardId" TEXT;

-- CreateIndex
CREATE INDEX "missions_rewardId_idx" ON "missions"("rewardId");

-- AddForeignKey: Mission -> Reward
ALTER TABLE "missions" ADD CONSTRAINT "missions_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Challenge — add rewardId
ALTER TABLE "challenges" ADD COLUMN "rewardId" TEXT;

-- CreateIndex
CREATE INDEX "challenges_rewardId_idx" ON "challenges"("rewardId");

-- AddForeignKey: Challenge -> Reward
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Quiz — add rewardId
ALTER TABLE "quizzes" ADD COLUMN "rewardId" TEXT;

-- CreateIndex
CREATE INDEX "quizzes_rewardId_idx" ON "quizzes"("rewardId");

-- AddForeignKey: Quiz -> Reward
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Quest — add rewardId
ALTER TABLE "quests" ADD COLUMN "rewardId" TEXT;

-- CreateIndex
CREATE INDEX "quests_rewardId_idx" ON "quests"("rewardId");

-- AddForeignKey: Quest -> Reward
ALTER TABLE "quests" ADD CONSTRAINT "quests_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: UserGamificationWallet — remove JSON badges column (replaced by user_earned_badges table)

-- CreateTable: UserEarnedBadge
CREATE TABLE "user_earned_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "rewardId" TEXT,
    "sourceType" "RewardSourceType",
    "sourceId" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_earned_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_earned_badges_userId_badgeId_key" ON "user_earned_badges"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "user_earned_badges_userId_idx" ON "user_earned_badges"("userId");

-- CreateIndex
CREATE INDEX "user_earned_badges_badgeId_idx" ON "user_earned_badges"("badgeId");

-- AddForeignKey: UserEarnedBadge -> User
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserEarnedBadge -> Badge
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_badgeId_fkey"
    FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserEarnedBadge -> Reward
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: WalletEntry — add rewardId, sourceType, sourceId
ALTER TABLE "wallet_entries" ADD COLUMN "rewardId" TEXT;
ALTER TABLE "wallet_entries" ADD COLUMN "sourceType" "RewardSourceType";
ALTER TABLE "wallet_entries" ADD COLUMN "sourceId" TEXT;

-- CreateIndex
CREATE INDEX "wallet_entries_rewardId_idx" ON "wallet_entries"("rewardId");

-- AddForeignKey: WalletEntry -> Reward
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
