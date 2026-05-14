-- CreateTable
CREATE TABLE "analytics_cross_dim_nutrition" (
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

    CONSTRAINT "analytics_cross_dim_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_cross_dim_classification" (
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

    CONSTRAINT "analytics_cross_dim_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_cross_dim_patterns" (
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

    CONSTRAINT "analytics_cross_dim_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_cross_dim_nutrition_dim1Name_dim2Name_idx" ON "analytics_cross_dim_nutrition"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "analytics_cross_dim_nutrition_date_idx" ON "analytics_cross_dim_nutrition"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cross_dim_nutrition_batchId_date_typeOfMeal_dim1N_key" ON "analytics_cross_dim_nutrition"("batchId", "date", "typeOfMeal", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- CreateIndex
CREATE INDEX "analytics_cross_dim_classification_dim1Name_dim2Name_idx" ON "analytics_cross_dim_classification"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "analytics_cross_dim_classification_date_idx" ON "analytics_cross_dim_classification"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cross_dim_classification_batchId_date_typeOfMeal__key" ON "analytics_cross_dim_classification"("batchId", "date", "typeOfMeal", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- CreateIndex
CREATE INDEX "analytics_cross_dim_patterns_dim1Name_dim2Name_idx" ON "analytics_cross_dim_patterns"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "analytics_cross_dim_patterns_date_idx" ON "analytics_cross_dim_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cross_dim_patterns_batchId_date_typeOfMeal_dim1Na_key" ON "analytics_cross_dim_patterns"("batchId", "date", "typeOfMeal", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- AddForeignKey
ALTER TABLE "analytics_cross_dim_nutrition" ADD CONSTRAINT "analytics_cross_dim_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_cross_dim_classification" ADD CONSTRAINT "analytics_cross_dim_classification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_cross_dim_patterns" ADD CONSTRAINT "analytics_cross_dim_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
