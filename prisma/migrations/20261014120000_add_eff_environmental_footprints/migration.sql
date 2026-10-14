-- EFSA EFF environmental footprints: one row per EFF product x country x basis,
-- with a per life-cycle stage breakdown, linked to NEVO generic foods. Seeded from
-- prisma/seeds/data/eff/eff_footprints.csv.gz and prisma/seeds/data/nevo/nevo_eff_mapping.csv.

-- CreateEnum
CREATE TYPE "EffMatchType" AS ENUM ('EXACT', 'EFF_NEVO_PROXY', 'PARENT_1', 'PARENT_2', 'MANUAL');

-- CreateEnum
CREATE TYPE "FootprintBasis" AS ENUM ('RETAIL', 'CONSUMED');

-- CreateEnum
CREATE TYPE "EffStage" AS ENUM ('ANIMAL_PRODUCTION', 'CROP_AND_PROCESSING_LOGISTICS', 'PROCESSING', 'PACKAGING', 'DISTRIBUTION', 'SUPERMARKET', 'CONSUMPTION', 'END_OF_LIFE');

-- AlterTable
ALTER TABLE "generic_foods" ADD COLUMN     "effMatchType" "EffMatchType",
ADD COLUMN     "effPreferredBasis" "FootprintBasis",
ADD COLUMN     "effProductId" TEXT;

-- CreateTable
CREATE TABLE "eff_products" (
    "id" TEXT NOT NULL,
    "foodex2Code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eff_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eff_footprints" (
    "id" TEXT NOT NULL,
    "effProductId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "basis" "FootprintBasis" NOT NULL,
    "climateChange" DOUBLE PRECISION NOT NULL,
    "landUse" DOUBLE PRECISION NOT NULL,
    "waterUse" DOUBLE PRECISION NOT NULL,
    "acidification" DOUBLE PRECISION NOT NULL,
    "particulateMatter" DOUBLE PRECISION NOT NULL,
    "eutrophicationMarine" DOUBLE PRECISION NOT NULL,
    "eutrophicationFreshwater" DOUBLE PRECISION NOT NULL,
    "eutrophicationTerrestrial" DOUBLE PRECISION NOT NULL,
    "humanToxicityCancer" DOUBLE PRECISION NOT NULL,
    "humanToxicityNonCancer" DOUBLE PRECISION NOT NULL,
    "ionisingRadiation" DOUBLE PRECISION NOT NULL,
    "ozoneDepletion" DOUBLE PRECISION NOT NULL,
    "photochemicalOzoneFormation" DOUBLE PRECISION NOT NULL,
    "resourceUseFossils" DOUBLE PRECISION NOT NULL,
    "resourceUseMineralsMetals" DOUBLE PRECISION NOT NULL,
    "ecotoxicityFreshwater" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "eff_footprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eff_footprint_stages" (
    "id" TEXT NOT NULL,
    "footprintId" TEXT NOT NULL,
    "stage" "EffStage" NOT NULL,
    "climateChange" DOUBLE PRECISION NOT NULL,
    "landUse" DOUBLE PRECISION NOT NULL,
    "waterUse" DOUBLE PRECISION NOT NULL,
    "acidification" DOUBLE PRECISION NOT NULL,
    "particulateMatter" DOUBLE PRECISION NOT NULL,
    "eutrophicationMarine" DOUBLE PRECISION NOT NULL,
    "eutrophicationFreshwater" DOUBLE PRECISION NOT NULL,
    "eutrophicationTerrestrial" DOUBLE PRECISION NOT NULL,
    "humanToxicityCancer" DOUBLE PRECISION NOT NULL,
    "humanToxicityNonCancer" DOUBLE PRECISION NOT NULL,
    "ionisingRadiation" DOUBLE PRECISION NOT NULL,
    "ozoneDepletion" DOUBLE PRECISION NOT NULL,
    "photochemicalOzoneFormation" DOUBLE PRECISION NOT NULL,
    "resourceUseFossils" DOUBLE PRECISION NOT NULL,
    "resourceUseMineralsMetals" DOUBLE PRECISION NOT NULL,
    "ecotoxicityFreshwater" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "eff_footprint_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eff_products_foodex2Code_key" ON "eff_products"("foodex2Code");

-- CreateIndex
CREATE INDEX "eff_footprints_country_basis_idx" ON "eff_footprints"("country", "basis");

-- CreateIndex
CREATE UNIQUE INDEX "eff_footprints_effProductId_country_basis_key" ON "eff_footprints"("effProductId", "country", "basis");

-- CreateIndex
CREATE UNIQUE INDEX "eff_footprint_stages_footprintId_stage_key" ON "eff_footprint_stages"("footprintId", "stage");

-- CreateIndex
CREATE INDEX "generic_foods_effProductId_idx" ON "generic_foods"("effProductId");

-- AddForeignKey
ALTER TABLE "generic_foods" ADD CONSTRAINT "generic_foods_effProductId_fkey" FOREIGN KEY ("effProductId") REFERENCES "eff_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eff_footprints" ADD CONSTRAINT "eff_footprints_effProductId_fkey" FOREIGN KEY ("effProductId") REFERENCES "eff_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eff_footprint_stages" ADD CONSTRAINT "eff_footprint_stages_footprintId_fkey" FOREIGN KEY ("footprintId") REFERENCES "eff_footprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

