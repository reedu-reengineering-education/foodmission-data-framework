-- CreateTable
CREATE TABLE "analytics_demographic_nutrition" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
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

    CONSTRAINT "analytics_demographic_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_demographic_classification" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
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

    CONSTRAINT "analytics_demographic_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_demographic_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeOfMeal" "TypeOfMeal" NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
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

    CONSTRAINT "analytics_demographic_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_demographic_nutrition_date_idx" ON "analytics_demographic_nutrition"("date");

-- CreateIndex
CREATE INDEX "analytics_demographic_nutrition_ageGroup_idx" ON "analytics_demographic_nutrition"("ageGroup");

-- CreateIndex
CREATE INDEX "analytics_demographic_nutrition_gender_idx" ON "analytics_demographic_nutrition"("gender");

-- CreateIndex
CREATE INDEX "analytics_demographic_nutrition_educationLevel_idx" ON "analytics_demographic_nutrition"("educationLevel");

-- CreateIndex
CREATE INDEX "analytics_demographic_nutrition_region_idx" ON "analytics_demographic_nutrition"("region");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_demographic_nutrition_batchId_date_typeOfMeal_age_key" ON "analytics_demographic_nutrition"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region");

-- CreateIndex
CREATE INDEX "analytics_demographic_classification_date_idx" ON "analytics_demographic_classification"("date");

-- CreateIndex
CREATE INDEX "analytics_demographic_classification_ageGroup_idx" ON "analytics_demographic_classification"("ageGroup");

-- CreateIndex
CREATE INDEX "analytics_demographic_classification_gender_idx" ON "analytics_demographic_classification"("gender");

-- CreateIndex
CREATE INDEX "analytics_demographic_classification_educationLevel_idx" ON "analytics_demographic_classification"("educationLevel");

-- CreateIndex
CREATE INDEX "analytics_demographic_classification_region_idx" ON "analytics_demographic_classification"("region");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_demographic_classification_batchId_date_typeOfMea_key" ON "analytics_demographic_classification"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region");

-- CreateIndex
CREATE INDEX "analytics_demographic_patterns_date_idx" ON "analytics_demographic_patterns"("date");

-- CreateIndex
CREATE INDEX "analytics_demographic_patterns_ageGroup_idx" ON "analytics_demographic_patterns"("ageGroup");

-- CreateIndex
CREATE INDEX "analytics_demographic_patterns_gender_idx" ON "analytics_demographic_patterns"("gender");

-- CreateIndex
CREATE INDEX "analytics_demographic_patterns_educationLevel_idx" ON "analytics_demographic_patterns"("educationLevel");

-- CreateIndex
CREATE INDEX "analytics_demographic_patterns_region_idx" ON "analytics_demographic_patterns"("region");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_demographic_patterns_batchId_date_typeOfMeal_ageG_key" ON "analytics_demographic_patterns"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region");

-- AddForeignKey
ALTER TABLE "analytics_demographic_nutrition" ADD CONSTRAINT "analytics_demographic_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_demographic_classification" ADD CONSTRAINT "analytics_demographic_classification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_demographic_patterns" ADD CONSTRAINT "analytics_demographic_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
