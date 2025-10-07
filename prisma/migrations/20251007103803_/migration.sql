/*
  Warnings:

  - The `unit` column on the `pantry_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unit` column on the `shopping_list_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Unit" AS ENUM ('PIECES', 'G', 'KG', 'ML', 'L', 'CUPS');

-- AlterTable
ALTER TABLE "public"."pantry_items" DROP COLUMN "unit",
ADD COLUMN     "unit" "public"."Unit" NOT NULL DEFAULT 'PIECES';

-- AlterTable
ALTER TABLE "public"."shopping_list_items" DROP COLUMN "unit",
ADD COLUMN     "unit" "public"."Unit" NOT NULL DEFAULT 'PIECES';
