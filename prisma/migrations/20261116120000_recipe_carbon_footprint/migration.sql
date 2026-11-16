ALTER TABLE "generic_foods" ADD COLUMN "carbonFootprint" DOUBLE PRECISION;

ALTER TABLE "recipes" DROP COLUMN "sustainabilityScore",
ADD COLUMN "carbonFootprint" DOUBLE PRECISION;
