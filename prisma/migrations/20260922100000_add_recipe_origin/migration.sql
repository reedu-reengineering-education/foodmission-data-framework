-- CreateEnum
CREATE TYPE "RecipeOrigin" AS ENUM ('THEMEALDB', 'USER');

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "origin" "RecipeOrigin" NOT NULL DEFAULT 'USER';

-- Backfill: all existing recipes were imported from TheMealDB
UPDATE "recipes" SET "origin" = 'THEMEALDB';

-- CreateIndex
CREATE INDEX "recipes_origin_idx" ON "recipes"("origin");
