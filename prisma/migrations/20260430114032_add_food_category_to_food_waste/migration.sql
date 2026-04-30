-- AlterTable
ALTER TABLE "food_waste" ALTER COLUMN "foodId" DROP NOT NULL;
ALTER TABLE "food_waste" ADD COLUMN "foodCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "food_waste_foodCategoryId_idx" ON "food_waste"("foodCategoryId");

-- AddForeignKey
ALTER TABLE "food_waste" ADD CONSTRAINT "food_waste_foodCategoryId_fkey" FOREIGN KEY ("foodCategoryId") REFERENCES "food_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
