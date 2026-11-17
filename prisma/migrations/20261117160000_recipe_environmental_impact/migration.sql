-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "sustainabilityScore",
ADD COLUMN     "environmentalImpact" JSONB;

