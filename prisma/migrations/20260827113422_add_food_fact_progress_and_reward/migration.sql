-- AlterEnum
ALTER TYPE "RewardSourceType" ADD VALUE 'FOOD_FACT';

-- AlterTable
ALTER TABLE "food_facts" ADD COLUMN "rewardId" TEXT;

-- CreateTable
CREATE TABLE "food_fact_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodFactId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_fact_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_fact_progress_userId_idx" ON "food_fact_progress"("userId");

-- CreateIndex
CREATE INDEX "food_fact_progress_foodFactId_idx" ON "food_fact_progress"("foodFactId");

-- CreateIndex
CREATE UNIQUE INDEX "food_fact_progress_userId_foodFactId_key" ON "food_fact_progress"("userId", "foodFactId");

-- CreateIndex
CREATE INDEX "food_facts_rewardId_idx" ON "food_facts"("rewardId");

-- AddForeignKey
ALTER TABLE "food_facts" ADD CONSTRAINT "food_facts_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_fact_progress" ADD CONSTRAINT "food_fact_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_fact_progress" ADD CONSTRAINT "food_fact_progress_foodFactId_fkey" FOREIGN KEY ("foodFactId") REFERENCES "food_facts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
