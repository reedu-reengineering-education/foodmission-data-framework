/*
  Warnings:

  - You are about to drop the column `location` on the `pantry_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,title]` on the table `Pantry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `Pantry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Pantry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Pantry" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."pantry_items" DROP COLUMN "location";

-- CreateIndex
CREATE UNIQUE INDEX "Pantry_userId_title_key" ON "public"."Pantry"("userId", "title");
