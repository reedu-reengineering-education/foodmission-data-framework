/*
  Warnings:

  - You are about to drop the column `dateOfBirth` on the `users` table. All the data in the column will be lost.
  - The `activityLevel` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `annualIncome` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `educationLevel` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "public"."AnnualIncomeLevel" AS ENUM ('BELOW_10000', 'FROM_10000_TO_19999', 'FROM_20000_TO_34999', 'FROM_35000_TO_49999', 'FROM_50000_TO_74999', 'FROM_75000_TO_99999', 'ABOVE_100000');

-- CreateEnum
CREATE TYPE "public"."EducationLevel" AS ENUM ('NO_FORMAL_EDUCATION', 'PRIMARY', 'SECONDARY', 'VOCATIONAL', 'BACHELORS', 'MASTERS', 'DOCTORATE');

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "dateOfBirth",
ADD COLUMN     "yearOfBirth" INTEGER,
DROP COLUMN "activityLevel",
ADD COLUMN     "activityLevel" "public"."ActivityLevel",
DROP COLUMN "annualIncome",
ADD COLUMN     "annualIncome" "public"."AnnualIncomeLevel",
DROP COLUMN "educationLevel",
ADD COLUMN     "educationLevel" "public"."EducationLevel";
