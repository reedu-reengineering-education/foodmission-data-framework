/*
  Warnings:

  - You are about to drop the `analytics_batches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_cross_dim_classification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_cross_dim_nutrition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_cross_dim_patterns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_daily_nutrition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_demographic_classification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_demographic_nutrition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_demographic_patterns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_food_popularity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_meal_classification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_meal_patterns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_meal_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_sustainability` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MealLogAnalyticsBatchStatus" AS ENUM ('STAGING', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "analytics_cross_dim_classification" DROP CONSTRAINT "analytics_cross_dim_classification_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_cross_dim_nutrition" DROP CONSTRAINT "analytics_cross_dim_nutrition_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_cross_dim_patterns" DROP CONSTRAINT "analytics_cross_dim_patterns_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_daily_nutrition" DROP CONSTRAINT "analytics_daily_nutrition_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_demographic_classification" DROP CONSTRAINT "analytics_demographic_classification_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_demographic_nutrition" DROP CONSTRAINT "analytics_demographic_nutrition_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_demographic_patterns" DROP CONSTRAINT "analytics_demographic_patterns_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_food_popularity" DROP CONSTRAINT "analytics_food_popularity_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_meal_classification" DROP CONSTRAINT "analytics_meal_classification_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_meal_patterns" DROP CONSTRAINT "analytics_meal_patterns_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_meal_records" DROP CONSTRAINT "analytics_meal_records_batchId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_sustainability" DROP CONSTRAINT "analytics_sustainability_batchId_fkey";

-- DropTable
DROP TABLE "analytics_batches";

-- DropTable
DROP TABLE "analytics_cross_dim_classification";

-- DropTable
DROP TABLE "analytics_cross_dim_nutrition";

-- DropTable
DROP TABLE "analytics_cross_dim_patterns";

-- DropTable
DROP TABLE "analytics_daily_nutrition";

-- DropTable
DROP TABLE "analytics_demographic_classification";

-- DropTable
DROP TABLE "analytics_demographic_nutrition";

-- DropTable
DROP TABLE "analytics_demographic_patterns";

-- DropTable
DROP TABLE "analytics_food_popularity";

-- DropTable
DROP TABLE "analytics_meal_classification";

-- DropTable
DROP TABLE "analytics_meal_patterns";

-- DropTable
DROP TABLE "analytics_meal_records";

-- DropTable
DROP TABLE "analytics_sustainability";

-- DropEnum
DROP TYPE "AnalyticsBatchStatus";

-- CreateTable
CREATE TABLE "meal_log_analytics_batches" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MealLogAnalyticsBatchStatus" NOT NULL DEFAULT 'STAGING',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_log_analytics_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_daily_nutrition" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "userCount" INTEGER NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "avgCalories" DOUBLE PRECISION,
    "avgProteins" DOUBLE PRECISION,
    "avgFat" DOUBLE PRECISION,
    "avgCarbs" DOUBLE PRECISION,
    "avgFiber" DOUBLE PRECISION,
    "avgSodium" DOUBLE PRECISION,
    "avgSugar" DOUBLE PRECISION,
    "avgSaturatedFat" DOUBLE PRECISION,
    "p25Calories" DOUBLE PRECISION,
    "p50Calories" DOUBLE PRECISION,
    "p75Calories" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_daily_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_food_popularity" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "foodName" TEXT NOT NULL,
    "foodGroup" TEXT,
    "itemType" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "avgQuantity" DOUBLE PRECISION NOT NULL,
    "predominantUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_food_popularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_meal_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "userCount" INTEGER NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "mealsFromPantryCount" INTEGER NOT NULL,
    "mealsFromPantryPct" DOUBLE PRECISION NOT NULL,
    "mealsEatenOutCount" INTEGER NOT NULL,
    "mealsEatenOutPct" DOUBLE PRECISION NOT NULL,
    "avgItemsPerMeal" DOUBLE PRECISION NOT NULL,
    "avgMealHour" DOUBLE PRECISION,
    "mealHourStdDev" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_meal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_sustainability" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "userCount" INTEGER NOT NULL,
    "avgSustainabilityScore" DOUBLE PRECISION,
    "avgCarbonFootprint" DOUBLE PRECISION,
    "nutriScoreDistribution" JSONB,
    "ecoScoreDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_sustainability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_meal_classification" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "userCount" INTEGER NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "vegetarianCount" INTEGER NOT NULL,
    "vegetarianPct" DOUBLE PRECISION NOT NULL,
    "veganCount" INTEGER NOT NULL,
    "veganPct" DOUBLE PRECISION NOT NULL,
    "avgUltraProcessedPct" DOUBLE PRECISION,
    "p25UltraProcessedPct" DOUBLE PRECISION,
    "p50UltraProcessedPct" DOUBLE PRECISION,
    "p75UltraProcessedPct" DOUBLE PRECISION,
    "novaDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_meal_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_meal_records" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "weeksSinceRegistration" INTEGER NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "totalCalories" DOUBLE PRECISION,
    "totalProteins" DOUBLE PRECISION,
    "totalFat" DOUBLE PRECISION,
    "totalCarbs" DOUBLE PRECISION,
    "totalFiber" DOUBLE PRECISION,
    "totalSodium" DOUBLE PRECISION,
    "totalSugar" DOUBLE PRECISION,
    "totalSaturatedFat" DOUBLE PRECISION,
    "nutriScoreGrade" TEXT,
    "ecoScoreGrade" TEXT,
    "novaGroupMode" INTEGER,
    "ultraProcessedPct" DOUBLE PRECISION,
    "sustainabilityScore" DOUBLE PRECISION,
    "totalCarbonFootprint" DOUBLE PRECISION,
    "isVegetarian" BOOLEAN NOT NULL,
    "isVegan" BOOLEAN NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_demographic_nutrition" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
    "country" TEXT,
    "userCount" INTEGER NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "avgCalories" DOUBLE PRECISION,
    "avgProteins" DOUBLE PRECISION,
    "avgFat" DOUBLE PRECISION,
    "avgCarbs" DOUBLE PRECISION,
    "avgFiber" DOUBLE PRECISION,
    "avgSodium" DOUBLE PRECISION,
    "avgSugar" DOUBLE PRECISION,
    "avgSaturatedFat" DOUBLE PRECISION,
    "p25Calories" DOUBLE PRECISION,
    "p50Calories" DOUBLE PRECISION,
    "p75Calories" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_demographic_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_demographic_classification" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
    "country" TEXT,
    "userCount" INTEGER NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "vegetarianCount" INTEGER NOT NULL,
    "vegetarianPct" DOUBLE PRECISION NOT NULL,
    "veganCount" INTEGER NOT NULL,
    "veganPct" DOUBLE PRECISION NOT NULL,
    "avgUltraProcessedPct" DOUBLE PRECISION,
    "p25UltraProcessedPct" DOUBLE PRECISION,
    "p50UltraProcessedPct" DOUBLE PRECISION,
    "p75UltraProcessedPct" DOUBLE PRECISION,
    "novaDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_demographic_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_demographic_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
    "country" TEXT,
    "userCount" INTEGER NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "mealsFromPantryCount" INTEGER NOT NULL,
    "mealsFromPantryPct" DOUBLE PRECISION NOT NULL,
    "mealsEatenOutCount" INTEGER NOT NULL,
    "mealsEatenOutPct" DOUBLE PRECISION NOT NULL,
    "avgItemsPerMeal" DOUBLE PRECISION NOT NULL,
    "avgMealHour" DOUBLE PRECISION,
    "mealHourStdDev" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_demographic_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_cross_dim_nutrition" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "dim1Name" TEXT NOT NULL,
    "dim1Value" TEXT NOT NULL,
    "dim2Name" TEXT NOT NULL,
    "dim2Value" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "avgCalories" DOUBLE PRECISION,
    "avgProteins" DOUBLE PRECISION,
    "avgFat" DOUBLE PRECISION,
    "avgCarbs" DOUBLE PRECISION,
    "avgFiber" DOUBLE PRECISION,
    "avgSodium" DOUBLE PRECISION,
    "avgSugar" DOUBLE PRECISION,
    "avgSaturatedFat" DOUBLE PRECISION,
    "p25Calories" DOUBLE PRECISION,
    "p50Calories" DOUBLE PRECISION,
    "p75Calories" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_cross_dim_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_cross_dim_classification" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "dim1Name" TEXT NOT NULL,
    "dim1Value" TEXT NOT NULL,
    "dim2Name" TEXT NOT NULL,
    "dim2Value" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "vegetarianCount" INTEGER NOT NULL,
    "vegetarianPct" DOUBLE PRECISION NOT NULL,
    "veganCount" INTEGER NOT NULL,
    "veganPct" DOUBLE PRECISION NOT NULL,
    "avgUltraProcessedPct" DOUBLE PRECISION,
    "p25UltraProcessedPct" DOUBLE PRECISION,
    "p50UltraProcessedPct" DOUBLE PRECISION,
    "p75UltraProcessedPct" DOUBLE PRECISION,
    "novaDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_cross_dim_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_analytics_cross_dim_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "dim1Name" TEXT NOT NULL,
    "dim1Value" TEXT NOT NULL,
    "dim2Name" TEXT NOT NULL,
    "dim2Value" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "mealsFromPantryCount" INTEGER NOT NULL,
    "mealsFromPantryPct" DOUBLE PRECISION NOT NULL,
    "mealsEatenOutCount" INTEGER NOT NULL,
    "mealsEatenOutPct" DOUBLE PRECISION NOT NULL,
    "avgItemsPerMeal" DOUBLE PRECISION NOT NULL,
    "avgMealHour" DOUBLE PRECISION,
    "mealHourStdDev" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_log_analytics_cross_dim_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_log_analytics_batches_status_idx" ON "meal_log_analytics_batches"("status");

-- CreateIndex
CREATE INDEX "meal_log_analytics_batches_periodStart_periodEnd_idx" ON "meal_log_analytics_batches"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "meal_log_analytics_daily_nutrition_date_idx" ON "meal_log_analytics_daily_nutrition"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_daily_nutrition_batchId_date_typeOfMeal_key" ON "meal_log_analytics_daily_nutrition"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "meal_log_analytics_food_popularity_date_idx" ON "meal_log_analytics_food_popularity"("date");

-- CreateIndex
CREATE INDEX "meal_log_analytics_food_popularity_frequency_idx" ON "meal_log_analytics_food_popularity"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_food_popularity_batchId_date_foodName_it_key" ON "meal_log_analytics_food_popularity"("batchId", "date", "foodName", "itemType");

-- CreateIndex
CREATE INDEX "meal_log_analytics_meal_patterns_date_idx" ON "meal_log_analytics_meal_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_meal_patterns_batchId_date_typeOfMeal_key" ON "meal_log_analytics_meal_patterns"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "meal_log_analytics_sustainability_date_idx" ON "meal_log_analytics_sustainability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_sustainability_batchId_date_typeOfMeal_key" ON "meal_log_analytics_sustainability"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "meal_log_analytics_meal_classification_date_idx" ON "meal_log_analytics_meal_classification"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_meal_classification_batchId_date_typeOfM_key" ON "meal_log_analytics_meal_classification"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "meal_log_analytics_meal_records_batchId_weeksSinceRegistrat_idx" ON "meal_log_analytics_meal_records"("batchId", "weeksSinceRegistration");

-- CreateIndex
CREATE INDEX "meal_log_analytics_meal_records_weeksSinceRegistration_type_idx" ON "meal_log_analytics_meal_records"("weeksSinceRegistration", "typeOfMeal");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_date_idx" ON "meal_log_analytics_demographic_nutrition"("date");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_ageGroup_idx" ON "meal_log_analytics_demographic_nutrition"("ageGroup");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_gender_idx" ON "meal_log_analytics_demographic_nutrition"("gender");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_educationLevel_idx" ON "meal_log_analytics_demographic_nutrition"("educationLevel");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_region_idx" ON "meal_log_analytics_demographic_nutrition"("region");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_country_idx" ON "meal_log_analytics_demographic_nutrition"("country");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_demographic_nutrition_batchId_date_typeO_key" ON "meal_log_analytics_demographic_nutrition"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_date_idx" ON "meal_log_analytics_demographic_classification"("date");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_ageGroup_idx" ON "meal_log_analytics_demographic_classification"("ageGroup");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_gender_idx" ON "meal_log_analytics_demographic_classification"("gender");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_educationLeve_idx" ON "meal_log_analytics_demographic_classification"("educationLevel");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_region_idx" ON "meal_log_analytics_demographic_classification"("region");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_country_idx" ON "meal_log_analytics_demographic_classification"("country");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_demographic_classification_batchId_date__key" ON "meal_log_analytics_demographic_classification"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_date_idx" ON "meal_log_analytics_demographic_patterns"("date");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_ageGroup_idx" ON "meal_log_analytics_demographic_patterns"("ageGroup");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_gender_idx" ON "meal_log_analytics_demographic_patterns"("gender");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_educationLevel_idx" ON "meal_log_analytics_demographic_patterns"("educationLevel");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_region_idx" ON "meal_log_analytics_demographic_patterns"("region");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_country_idx" ON "meal_log_analytics_demographic_patterns"("country");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_demographic_patterns_batchId_date_typeOf_key" ON "meal_log_analytics_demographic_patterns"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "meal_log_analytics_cross_dim_nutrition_dim1Name_dim2Name_idx" ON "meal_log_analytics_cross_dim_nutrition"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "meal_log_analytics_cross_dim_nutrition_date_idx" ON "meal_log_analytics_cross_dim_nutrition"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_cross_dim_nutrition_batchId_date_typeOfM_key" ON "meal_log_analytics_cross_dim_nutrition"("batchId", "date", "typeOfMeal", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- CreateIndex
CREATE INDEX "meal_log_analytics_cross_dim_classification_dim1Name_dim2Na_idx" ON "meal_log_analytics_cross_dim_classification"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "meal_log_analytics_cross_dim_classification_date_idx" ON "meal_log_analytics_cross_dim_classification"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_cross_dim_classification_batchId_date_ty_key" ON "meal_log_analytics_cross_dim_classification"("batchId", "date", "typeOfMeal", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- CreateIndex
CREATE INDEX "meal_log_analytics_cross_dim_patterns_dim1Name_dim2Name_idx" ON "meal_log_analytics_cross_dim_patterns"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "meal_log_analytics_cross_dim_patterns_date_idx" ON "meal_log_analytics_cross_dim_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_cross_dim_patterns_batchId_date_typeOfMe_key" ON "meal_log_analytics_cross_dim_patterns"("batchId", "date", "typeOfMeal", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- AddForeignKey
ALTER TABLE "meal_log_analytics_daily_nutrition" ADD CONSTRAINT "meal_log_analytics_daily_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_food_popularity" ADD CONSTRAINT "meal_log_analytics_food_popularity_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_meal_patterns" ADD CONSTRAINT "meal_log_analytics_meal_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_sustainability" ADD CONSTRAINT "meal_log_analytics_sustainability_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_meal_classification" ADD CONSTRAINT "meal_log_analytics_meal_classification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_meal_records" ADD CONSTRAINT "meal_log_analytics_meal_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_demographic_nutrition" ADD CONSTRAINT "meal_log_analytics_demographic_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_demographic_classification" ADD CONSTRAINT "meal_log_analytics_demographic_classification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_demographic_patterns" ADD CONSTRAINT "meal_log_analytics_demographic_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_cross_dim_nutrition" ADD CONSTRAINT "meal_log_analytics_cross_dim_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_cross_dim_classification" ADD CONSTRAINT "meal_log_analytics_cross_dim_classification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_analytics_cross_dim_patterns" ADD CONSTRAINT "meal_log_analytics_cross_dim_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "meal_log_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
