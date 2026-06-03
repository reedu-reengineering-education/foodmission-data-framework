/*
  Warnings:

  - You are about to drop the column `ageGroup` on the `meal_log_analytics_demographic_classification` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `meal_log_analytics_demographic_classification` table. All the data in the column will be lost.
  - You are about to drop the column `educationLevel` on the `meal_log_analytics_demographic_classification` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `meal_log_analytics_demographic_classification` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `meal_log_analytics_demographic_classification` table. All the data in the column will be lost.
  - You are about to drop the column `ageGroup` on the `meal_log_analytics_demographic_nutrition` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `meal_log_analytics_demographic_nutrition` table. All the data in the column will be lost.
  - You are about to drop the column `educationLevel` on the `meal_log_analytics_demographic_nutrition` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `meal_log_analytics_demographic_nutrition` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `meal_log_analytics_demographic_nutrition` table. All the data in the column will be lost.
  - You are about to drop the column `ageGroup` on the `meal_log_analytics_demographic_patterns` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `meal_log_analytics_demographic_patterns` table. All the data in the column will be lost.
  - You are about to drop the column `educationLevel` on the `meal_log_analytics_demographic_patterns` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `meal_log_analytics_demographic_patterns` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `meal_log_analytics_demographic_patterns` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[batchId,date,typeOfMeal,dimensionName,dimensionValue]` on the table `meal_log_analytics_demographic_classification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[batchId,date,typeOfMeal,dimensionName,dimensionValue]` on the table `meal_log_analytics_demographic_nutrition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[batchId,date,typeOfMeal,dimensionName,dimensionValue]` on the table `meal_log_analytics_demographic_patterns` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dimensionName` to the `meal_log_analytics_demographic_classification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dimensionValue` to the `meal_log_analytics_demographic_classification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dimensionName` to the `meal_log_analytics_demographic_nutrition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dimensionValue` to the `meal_log_analytics_demographic_nutrition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dimensionName` to the `meal_log_analytics_demographic_patterns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dimensionValue` to the `meal_log_analytics_demographic_patterns` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "meal_log_analytics_demographic_classification_ageGroup_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_classification_batchId_date__key";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_classification_country_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_classification_educationLeve_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_classification_gender_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_classification_region_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_nutrition_ageGroup_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_nutrition_batchId_date_typeO_key";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_nutrition_country_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_nutrition_educationLevel_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_nutrition_gender_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_nutrition_region_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_patterns_ageGroup_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_patterns_batchId_date_typeOf_key";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_patterns_country_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_patterns_educationLevel_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_patterns_gender_idx";

-- DropIndex
DROP INDEX "meal_log_analytics_demographic_patterns_region_idx";

-- AlterTable
-- Truncate first so the NOT NULL ADD COLUMN succeeds regardless of existing data.
-- Analytics data is derived and will be regenerated on next aggregation run.
TRUNCATE TABLE "meal_log_analytics_demographic_classification" CASCADE;
ALTER TABLE "meal_log_analytics_demographic_classification" DROP COLUMN "ageGroup",
DROP COLUMN "country",
DROP COLUMN "educationLevel",
DROP COLUMN "gender",
DROP COLUMN "region",
ADD COLUMN     "dimensionName" TEXT NOT NULL,
ADD COLUMN     "dimensionValue" TEXT NOT NULL;

-- AlterTable
TRUNCATE TABLE "meal_log_analytics_demographic_nutrition" CASCADE;
ALTER TABLE "meal_log_analytics_demographic_nutrition" DROP COLUMN "ageGroup",
DROP COLUMN "country",
DROP COLUMN "educationLevel",
DROP COLUMN "gender",
DROP COLUMN "region",
ADD COLUMN     "dimensionName" TEXT NOT NULL,
ADD COLUMN     "dimensionValue" TEXT NOT NULL;

-- AlterTable
TRUNCATE TABLE "meal_log_analytics_demographic_patterns" CASCADE;
ALTER TABLE "meal_log_analytics_demographic_patterns" DROP COLUMN "ageGroup",
DROP COLUMN "country",
DROP COLUMN "educationLevel",
DROP COLUMN "gender",
DROP COLUMN "region",
ADD COLUMN     "dimensionName" TEXT NOT NULL,
ADD COLUMN     "dimensionValue" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_classification_dimensionName_idx" ON "meal_log_analytics_demographic_classification"("dimensionName");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_demographic_classification_batchId_date__key" ON "meal_log_analytics_demographic_classification"("batchId", "date", "typeOfMeal", "dimensionName", "dimensionValue");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_nutrition_dimensionName_idx" ON "meal_log_analytics_demographic_nutrition"("dimensionName");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_demographic_nutrition_batchId_date_typeO_key" ON "meal_log_analytics_demographic_nutrition"("batchId", "date", "typeOfMeal", "dimensionName", "dimensionValue");

-- CreateIndex
CREATE INDEX "meal_log_analytics_demographic_patterns_dimensionName_idx" ON "meal_log_analytics_demographic_patterns"("dimensionName");

-- CreateIndex
CREATE UNIQUE INDEX "meal_log_analytics_demographic_patterns_batchId_date_typeOf_key" ON "meal_log_analytics_demographic_patterns"("batchId", "date", "typeOfMeal", "dimensionName", "dimensionValue");
