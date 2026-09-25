-- AlterEnum
ALTER TYPE "RewardSourceType" ADD VALUE 'SURVEY';

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN "rewardId" TEXT;

-- CreateIndex
CREATE INDEX "surveys_rewardId_idx" ON "surveys"("rewardId");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
