/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "activityLevel" TEXT,
ADD COLUMN     "annualIncome" DOUBLE PRECISION,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "gender" "public"."Gender",
ADD COLUMN     "healthGoals" JSONB DEFAULT '{}',
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "nutritionTargets" JSONB DEFAULT '{}',
ADD COLUMN     "region" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "weightKg" DOUBLE PRECISION,
ADD COLUMN     "zip" TEXT,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");
