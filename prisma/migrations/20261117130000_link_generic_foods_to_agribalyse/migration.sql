-- AlterTable
ALTER TABLE "generic_foods" ADD COLUMN     "agribalyseCode" TEXT;

-- AddForeignKey
ALTER TABLE "generic_foods" ADD CONSTRAINT "generic_foods_agribalyseCode_fkey" FOREIGN KEY ("agribalyseCode") REFERENCES "agribalyse_foods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

