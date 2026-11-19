-- AlterTable
ALTER TABLE "food_products" DROP COLUMN "carbonFootprint",
ADD COLUMN     "agribalyseCode" TEXT;

-- AlterTable
ALTER TABLE "generic_foods" ADD COLUMN     "agribalyseCode" TEXT;

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "sustainabilityScore",
ADD COLUMN     "environmentalImpact" JSONB;

-- CreateTable
CREATE TABLE "agribalyse_foods" (
    "code" TEXT NOT NULL,
    "ciqualCode" INTEGER NOT NULL,
    "foodGroup" TEXT NOT NULL,
    "foodSubgroup" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "preparation" TEXT NOT NULL,
    "dqr" DOUBLE PRECISION NOT NULL,
    "efScorePerKg" DOUBLE PRECISION NOT NULL,
    "co2PerKg" DOUBLE PRECISION NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "agribalyse_foods_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "food_products" ADD CONSTRAINT "food_products_agribalyseCode_fkey" FOREIGN KEY ("agribalyseCode") REFERENCES "agribalyse_foods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generic_foods" ADD CONSTRAINT "generic_foods_agribalyseCode_fkey" FOREIGN KEY ("agribalyseCode") REFERENCES "agribalyse_foods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

