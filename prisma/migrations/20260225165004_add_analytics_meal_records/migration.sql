-- CreateTable
CREATE TABLE "analytics_meal_records" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
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

    CONSTRAINT "analytics_meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_meal_records_batchId_date_idx" ON "analytics_meal_records"("batchId", "date");

-- CreateIndex
CREATE INDEX "analytics_meal_records_date_typeOfMeal_idx" ON "analytics_meal_records"("date", "typeOfMeal");

-- AddForeignKey
ALTER TABLE "analytics_meal_records" ADD CONSTRAINT "analytics_meal_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
