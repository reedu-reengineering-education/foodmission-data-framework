-- CreateEnum
CREATE TYPE "AnalyticsBatchStatus" AS ENUM ('STAGING', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "analytics_batches" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "AnalyticsBatchStatus" NOT NULL DEFAULT 'STAGING',
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

    CONSTRAINT "analytics_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_daily_nutrition" (
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

    CONSTRAINT "analytics_daily_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_food_popularity" (
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

    CONSTRAINT "analytics_food_popularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_meal_patterns" (
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

    CONSTRAINT "analytics_meal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_sustainability" (
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

    CONSTRAINT "analytics_sustainability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_meal_classification" (
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

    CONSTRAINT "analytics_meal_classification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_batches_status_idx" ON "analytics_batches"("status");

-- CreateIndex
CREATE INDEX "analytics_batches_periodStart_periodEnd_idx" ON "analytics_batches"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "analytics_daily_nutrition_date_idx" ON "analytics_daily_nutrition"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_daily_nutrition_batchId_date_typeOfMeal_key" ON "analytics_daily_nutrition"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "analytics_food_popularity_date_idx" ON "analytics_food_popularity"("date");

-- CreateIndex
CREATE INDEX "analytics_food_popularity_frequency_idx" ON "analytics_food_popularity"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_food_popularity_batchId_date_foodName_itemType_key" ON "analytics_food_popularity"("batchId", "date", "foodName", "itemType");

-- CreateIndex
CREATE INDEX "analytics_meal_patterns_date_idx" ON "analytics_meal_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_meal_patterns_batchId_date_typeOfMeal_key" ON "analytics_meal_patterns"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "analytics_sustainability_date_idx" ON "analytics_sustainability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_sustainability_batchId_date_typeOfMeal_key" ON "analytics_sustainability"("batchId", "date", "typeOfMeal");

-- CreateIndex
CREATE INDEX "analytics_meal_classification_date_idx" ON "analytics_meal_classification"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_meal_classification_batchId_date_typeOfMeal_key" ON "analytics_meal_classification"("batchId", "date", "typeOfMeal");

-- AddForeignKey
ALTER TABLE "analytics_daily_nutrition" ADD CONSTRAINT "analytics_daily_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_food_popularity" ADD CONSTRAINT "analytics_food_popularity_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_meal_patterns" ADD CONSTRAINT "analytics_meal_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_sustainability" ADD CONSTRAINT "analytics_sustainability_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_meal_classification" ADD CONSTRAINT "analytics_meal_classification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
