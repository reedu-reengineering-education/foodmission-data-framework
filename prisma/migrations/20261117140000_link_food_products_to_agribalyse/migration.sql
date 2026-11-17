-- AlterTable
ALTER TABLE "food_products" ADD COLUMN     "agribalyseCode" TEXT;

-- AddForeignKey
ALTER TABLE "food_products" ADD CONSTRAINT "food_products_agribalyseCode_fkey" FOREIGN KEY ("agribalyseCode") REFERENCES "agribalyse_foods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

