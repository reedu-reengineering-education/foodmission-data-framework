/*
  Warnings:

  - A unique constraint covering the columns `[batchId,date,typeOfMeal,ageGroup,gender,educationLevel,region,country]` on the table `analytics_demographic_classification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[batchId,date,typeOfMeal,ageGroup,gender,educationLevel,region,country]` on the table `analytics_demographic_nutrition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[batchId,date,typeOfMeal,ageGroup,gender,educationLevel,region,country]` on the table `analytics_demographic_patterns` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "analytics_demographic_classification_batchId_date_typeOfMea_key";

-- DropIndex
DROP INDEX "analytics_demographic_nutrition_batchId_date_typeOfMeal_age_key";

-- DropIndex
DROP INDEX "analytics_demographic_patterns_batchId_date_typeOfMeal_ageG_key";

-- AlterTable
ALTER TABLE "analytics_demographic_classification" ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "analytics_demographic_nutrition" ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "analytics_demographic_patterns" ADD COLUMN     "country" TEXT;

-- CreateIndex
CREATE INDEX "analytics_demographic_classification_country_idx" ON "analytics_demographic_classification"("country");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_demographic_classification_batchId_date_typeOfMea_key" ON "analytics_demographic_classification"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "analytics_demographic_nutrition_country_idx" ON "analytics_demographic_nutrition"("country");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_demographic_nutrition_batchId_date_typeOfMeal_age_key" ON "analytics_demographic_nutrition"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region", "country");

-- CreateIndex
CREATE INDEX "analytics_demographic_patterns_country_idx" ON "analytics_demographic_patterns"("country");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_demographic_patterns_batchId_date_typeOfMeal_ageG_key" ON "analytics_demographic_patterns"("batchId", "date", "typeOfMeal", "ageGroup", "gender", "educationLevel", "region", "country");
