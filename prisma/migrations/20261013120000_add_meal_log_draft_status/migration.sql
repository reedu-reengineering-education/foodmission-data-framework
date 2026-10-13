-- Staged meal logs: a DRAFT log records no events until it is confirmed.
-- Existing rows (and direct creates) are CONFIRMED.

-- CreateEnum
CREATE TYPE "MealLogStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- AlterTable
ALTER TABLE "meal_logs"
    ADD COLUMN "status" "MealLogStatus" NOT NULL DEFAULT 'CONFIRMED',
    ADD COLUMN "derivedFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "meal_logs_userId_status_idx" ON "meal_logs"("userId", "status");

-- CreateIndex
CREATE INDEX "meal_logs_status_createdAt_idx" ON "meal_logs"("status", "createdAt");
