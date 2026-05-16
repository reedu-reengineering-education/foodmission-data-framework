-- CreateEnum
CREATE TYPE "ShoppingListAnalyticsBatchStatus" AS ENUM ('STAGING', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "shopping_list_analytics_batches" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ShoppingListAnalyticsBatchStatus" NOT NULL DEFAULT 'STAGING',
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

    CONSTRAINT "shopping_list_analytics_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_item_popularity" (
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

    CONSTRAINT "shopping_list_analytics_item_popularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_category_popularity" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_category_popularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_list_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userCount" INTEGER NOT NULL,
    "totalLists" INTEGER NOT NULL,
    "avgItemsPerList" DOUBLE PRECISION NOT NULL,
    "avgListsPerUser" DOUBLE PRECISION NOT NULL,
    "foodProductPct" DOUBLE PRECISION NOT NULL,
    "genericFoodPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_list_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_nutrition_profile" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userCount" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "avgCaloriesPer100g" DOUBLE PRECISION,
    "avgProteinsPer100g" DOUBLE PRECISION,
    "avgFatPer100g" DOUBLE PRECISION,
    "avgCarbsPer100g" DOUBLE PRECISION,
    "avgFiberPer100g" DOUBLE PRECISION,
    "avgSodiumPer100g" DOUBLE PRECISION,
    "avgSugarPer100g" DOUBLE PRECISION,
    "avgSaturatedFatPer100g" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_nutrition_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_sustainability" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userCount" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "avgCarbonFootprint" DOUBLE PRECISION,
    "nutriScoreDistribution" JSONB,
    "ecoScoreDistribution" JSONB,
    "novaDistribution" JSONB,
    "vegetarianItemPct" DOUBLE PRECISION,
    "veganItemPct" DOUBLE PRECISION,
    "avgUltraProcessedPct" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_sustainability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_food_groups" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "foodGroup" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "avgQuantity" DOUBLE PRECISION NOT NULL,
    "predominantUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_food_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_demographic_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
    "country" TEXT,
    "userCount" INTEGER NOT NULL,
    "totalLists" INTEGER NOT NULL,
    "avgItemsPerList" DOUBLE PRECISION NOT NULL,
    "avgListsPerUser" DOUBLE PRECISION NOT NULL,
    "foodProductPct" DOUBLE PRECISION NOT NULL,
    "genericFoodPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_demographic_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_demographic_nutrition" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ageGroup" TEXT,
    "gender" TEXT,
    "educationLevel" TEXT,
    "region" TEXT,
    "country" TEXT,
    "userCount" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "avgCaloriesPer100g" DOUBLE PRECISION,
    "avgProteinsPer100g" DOUBLE PRECISION,
    "avgFatPer100g" DOUBLE PRECISION,
    "avgCarbsPer100g" DOUBLE PRECISION,
    "avgFiberPer100g" DOUBLE PRECISION,
    "avgSodiumPer100g" DOUBLE PRECISION,
    "avgSugarPer100g" DOUBLE PRECISION,
    "avgSaturatedFatPer100g" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_demographic_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_cross_dim_patterns" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dim1Name" TEXT NOT NULL,
    "dim1Value" TEXT NOT NULL,
    "dim2Name" TEXT NOT NULL,
    "dim2Value" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "totalLists" INTEGER NOT NULL,
    "avgItemsPerList" DOUBLE PRECISION NOT NULL,
    "avgListsPerUser" DOUBLE PRECISION NOT NULL,
    "foodProductPct" DOUBLE PRECISION NOT NULL,
    "genericFoodPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_cross_dim_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_analytics_cross_dim_nutrition" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dim1Name" TEXT NOT NULL,
    "dim1Value" TEXT NOT NULL,
    "dim2Name" TEXT NOT NULL,
    "dim2Value" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "avgCaloriesPer100g" DOUBLE PRECISION,
    "avgProteinsPer100g" DOUBLE PRECISION,
    "avgFatPer100g" DOUBLE PRECISION,
    "avgCarbsPer100g" DOUBLE PRECISION,
    "avgFiberPer100g" DOUBLE PRECISION,
    "avgSodiumPer100g" DOUBLE PRECISION,
    "avgSugarPer100g" DOUBLE PRECISION,
    "avgSaturatedFatPer100g" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_analytics_cross_dim_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopping_list_analytics_batches_status_idx" ON "shopping_list_analytics_batches"("status");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_batches_periodStart_periodEnd_idx" ON "shopping_list_analytics_batches"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_item_popularity_date_idx" ON "shopping_list_analytics_item_popularity"("date");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_item_popularity_frequency_idx" ON "shopping_list_analytics_item_popularity"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_item_popularity_batchId_date_foodNa_key" ON "shopping_list_analytics_item_popularity"("batchId", "date", "foodName", "itemType");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_category_popularity_date_idx" ON "shopping_list_analytics_category_popularity"("date");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_category_popularity_frequency_idx" ON "shopping_list_analytics_category_popularity"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_category_popularity_batchId_date_ca_key" ON "shopping_list_analytics_category_popularity"("batchId", "date", "category");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_list_patterns_date_idx" ON "shopping_list_analytics_list_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_list_patterns_batchId_date_key" ON "shopping_list_analytics_list_patterns"("batchId", "date");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_nutrition_profile_date_idx" ON "shopping_list_analytics_nutrition_profile"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_nutrition_profile_batchId_date_key" ON "shopping_list_analytics_nutrition_profile"("batchId", "date");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_sustainability_date_idx" ON "shopping_list_analytics_sustainability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_sustainability_batchId_date_key" ON "shopping_list_analytics_sustainability"("batchId", "date");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_food_groups_date_idx" ON "shopping_list_analytics_food_groups"("date");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_food_groups_frequency_idx" ON "shopping_list_analytics_food_groups"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_food_groups_batchId_date_foodGroup_key" ON "shopping_list_analytics_food_groups"("batchId", "date", "foodGroup");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_patterns_ageGroup_idx" ON "shopping_list_analytics_demographic_patterns"("ageGroup");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_patterns_gender_idx" ON "shopping_list_analytics_demographic_patterns"("gender");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_patterns_educationLevel_idx" ON "shopping_list_analytics_demographic_patterns"("educationLevel");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_patterns_date_idx" ON "shopping_list_analytics_demographic_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_demographic_patterns_batchId_date_a_key" ON "shopping_list_analytics_demographic_patterns"("batchId", "date", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_nutrition_ageGroup_idx" ON "shopping_list_analytics_demographic_nutrition"("ageGroup");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_nutrition_gender_idx" ON "shopping_list_analytics_demographic_nutrition"("gender");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_nutrition_educationLeve_idx" ON "shopping_list_analytics_demographic_nutrition"("educationLevel");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_demographic_nutrition_date_idx" ON "shopping_list_analytics_demographic_nutrition"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_demographic_nutrition_batchId_date__key" ON "shopping_list_analytics_demographic_nutrition"("batchId", "date", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_cross_dim_patterns_dim1Name_dim2Nam_idx" ON "shopping_list_analytics_cross_dim_patterns"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_cross_dim_patterns_date_idx" ON "shopping_list_analytics_cross_dim_patterns"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_cross_dim_patterns_batchId_date_dim_key" ON "shopping_list_analytics_cross_dim_patterns"("batchId", "date", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_cross_dim_nutrition_dim1Name_dim2Na_idx" ON "shopping_list_analytics_cross_dim_nutrition"("dim1Name", "dim2Name");

-- CreateIndex
CREATE INDEX "shopping_list_analytics_cross_dim_nutrition_date_idx" ON "shopping_list_analytics_cross_dim_nutrition"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_analytics_cross_dim_nutrition_batchId_date_di_key" ON "shopping_list_analytics_cross_dim_nutrition"("batchId", "date", "dim1Name", "dim1Value", "dim2Name", "dim2Value");

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_item_popularity" ADD CONSTRAINT "shopping_list_analytics_item_popularity_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_category_popularity" ADD CONSTRAINT "shopping_list_analytics_category_popularity_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_list_patterns" ADD CONSTRAINT "shopping_list_analytics_list_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_nutrition_profile" ADD CONSTRAINT "shopping_list_analytics_nutrition_profile_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_sustainability" ADD CONSTRAINT "shopping_list_analytics_sustainability_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_food_groups" ADD CONSTRAINT "shopping_list_analytics_food_groups_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_demographic_patterns" ADD CONSTRAINT "shopping_list_analytics_demographic_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_demographic_nutrition" ADD CONSTRAINT "shopping_list_analytics_demographic_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_cross_dim_patterns" ADD CONSTRAINT "shopping_list_analytics_cross_dim_patterns_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_analytics_cross_dim_nutrition" ADD CONSTRAINT "shopping_list_analytics_cross_dim_nutrition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "shopping_list_analytics_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
