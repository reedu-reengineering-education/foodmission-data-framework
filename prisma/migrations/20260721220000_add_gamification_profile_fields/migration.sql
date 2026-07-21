-- CreateEnum
CREATE TYPE "ProgressIndicatorKind" AS ENUM ('FOOD_CHOICES', 'FOOD_AND_WASTE', 'HEALTH', 'CO2_REDUCTION', 'ENERGY_REDUCTION', 'WATER_SAVINGS', 'LAND_USE_REDUCTION', 'PROTEIN', 'FAT', 'SUGAR', 'SALT', 'FIBER', 'VITAMINS', 'CALORIES');

-- CreateEnum
CREATE TYPE "ProgressPrecision" AS ENUM ('SOFT', 'PRECISE');

-- CreateEnum
CREATE TYPE "WeeklyMeatRange" AS ENUM ('ZERO_TO_FOUR', 'FIVE_TO_NINE', 'TEN_TO_FOURTEEN', 'FIFTEEN_PLUS');

-- CreateEnum
CREATE TYPE "WeeklyBeefFrequency" AS ENUM ('NEVER', 'LESS_THAN_ONCE_PER_WEEK', 'ONE_TO_TWO_TIMES_PER_WEEK', 'THREE_PLUS_TIMES_PER_WEEK');

-- CreateEnum
CREATE TYPE "WeeklyFoodWasteRange" AS ENUM ('ZERO', 'ONE_TO_TWO', 'THREE_TO_FOUR', 'FIVE_PLUS');

-- CreateEnum
CREATE TYPE "WeeklyUpfRange" AS ENUM ('ZERO_TO_THREE', 'FOUR_TO_NINE', 'TEN_TO_FOURTEEN', 'FIFTEEN_PLUS');

-- CreateEnum
CREATE TYPE "WeeklyReusableRange" AS ENUM ('ZERO_TO_TWO', 'THREE_TO_SIX', 'SEVEN_TO_NINE', 'TEN_PLUS');

-- CreateEnum
CREATE TYPE "UserSegment" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Motivation" AS ENUM ('SUSTAINABLE_HABITS', 'PLANETARY_IMPACT', 'SUSTAINABILITY_KNOWLEDGE');

-- AlterTable
ALTER TABLE "user_groups" ADD COLUMN "currentQuestId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "currentQuestId" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "segment" "UserSegment",
ADD COLUMN "weeklyBeefConsumption" "WeeklyBeefFrequency",
ADD COLUMN "weeklyFoodWaste" "WeeklyFoodWasteRange",
ADD COLUMN "weeklyMeatConsumption" "WeeklyMeatRange",
ADD COLUMN "weeklyReusableOrRefill" "WeeklyReusableRange",
ADD COLUMN "weeklyUpfConsumption" "WeeklyUpfRange";

-- CreateTable
CREATE TABLE "user_gamification_wallets" (
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gamification_wallets_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "progress_indicators" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "kind" "ProgressIndicatorKind" NOT NULL,
    "precision" "ProgressPrecision" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "accumulatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "allTimeTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cycleStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_indicators_userId_idx" ON "progress_indicators"("userId");

-- CreateIndex
CREATE INDEX "progress_indicators_groupId_idx" ON "progress_indicators"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "progress_indicators_userId_kind_key" ON "progress_indicators"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "progress_indicators_groupId_kind_key" ON "progress_indicators"("groupId", "kind");

-- AddForeignKey
ALTER TABLE "user_gamification_wallets" ADD CONSTRAINT "user_gamification_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_indicators" ADD CONSTRAINT "progress_indicators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_indicators" ADD CONSTRAINT "progress_indicators_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
