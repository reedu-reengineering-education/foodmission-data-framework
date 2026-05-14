/*
  Warnings:

  - You are about to drop the column `date` on the `analytics_meal_records` table. All the data in the column will be lost.
  - Added the required column `weeksSinceRegistration` to the `analytics_meal_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "analytics_meal_records_batchId_date_idx";

-- DropIndex
DROP INDEX "analytics_meal_records_date_typeOfMeal_idx";

-- Truncate analytics_meal_records — safe to drop, data is always regenerated from source
TRUNCATE TABLE "analytics_meal_records";

-- AlterTable
ALTER TABLE "analytics_meal_records" DROP COLUMN "date",
ADD COLUMN     "weeksSinceRegistration" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "analytics_meal_records_batchId_weeksSinceRegistration_idx" ON "analytics_meal_records"("batchId", "weeksSinceRegistration");

-- CreateIndex
CREATE INDEX "analytics_meal_records_weeksSinceRegistration_typeOfMeal_idx" ON "analytics_meal_records"("weeksSinceRegistration", "typeOfMeal");
